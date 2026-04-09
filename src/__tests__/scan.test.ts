import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scan } from '../index.js';
import type { ScanOptions } from '../types.js';

vi.mock('../scanner/http.js', () => ({
  sendDiscoveryRequest: vi.fn(),
  sendPaidRequest: vi.fn(),
}));

vi.mock('../scanner/cdp.js', () => ({
  checkCdpAvailable: vi.fn().mockResolvedValue(false),
  getCdpSupported: vi.fn().mockResolvedValue({ schemes: [], networks: [] }),
  checkCdpCompatibility: vi.fn().mockReturnValue({ compatible: false, issues: [] }),
}));

vi.mock('../rules/facilitator.js', async (importOriginal) => {
  const orig = (await importOriginal()) as Record<string, unknown>;
  return {
    ...orig,
    checkFacilitatorReachable: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
  };
});

import { sendDiscoveryRequest, sendPaidRequest } from '../scanner/http.js';

const mockedSendDiscovery = vi.mocked(sendDiscoveryRequest);
const mockedSendPaid = vi.mocked(sendPaidRequest);

const defaultOptions: ScanOptions = {
  pay: false,
  timeout: 5000,
  format: 'text',
};

function validPayload() {
  return JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '0.01',
    payTo: '0xabc123',
  });
}

describe('scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns passing result for compliant endpoint', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(true);
    expect(result.score.total).toBeGreaterThan(0);
    expect(result.discovery).not.toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('passes when endpoint returns 200 with valid discovery payload', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(true);
    const statusRule = result.rules.find((r) => r.id === 'discovery.status-402');
    expect(statusRule?.passed).toBe(true);
  });

  it('fails when endpoint returns 200 with no discovery payload', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 200,
      headers: {},
      body: 'OK',
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 0,
      headers: {},
      body: '',
      responseTimeMs: 50,
      error:
        'Endpoint is unreachable (connection refused). The server may be down or not listening on the expected port.',
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('unreachable');
    expect(result.rules).toEqual([]);
  });

  it('validates amount is positive', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        asset: 'USDC',
        amount: '-5',
        payTo: '0xabc',
      }),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    const amountRule = result.rules.find((r) => r.id === 'pricing.amount-valid');
    expect(amountRule?.passed).toBe(false);
  });

  it('includes score breakdown by category', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.score.categories.length).toBeGreaterThan(0);
    const discovery = result.score.categories.find((c) => c.category === 'discovery');
    expect(discovery).toBeDefined();
  });

  it('sets timestamp on result', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('includes paymentFlow in result when pay mode enabled', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', { ...defaultOptions, pay: true });
    expect(result.paymentFlow).toBeDefined();
    expect(result.paymentFlow?.skipped).toBe(true);
  });

  it('does not include paymentFlow when pay mode off', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.paymentFlow).toBeUndefined();
  });

  it('includes payment rule result when pay mode enabled', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', { ...defaultOptions, pay: true });
    const paymentRule = result.rules.find((r) => r.id === 'flow.payment-verified');
    expect(paymentRule).toBeDefined();
  });

  it('passes payment rule when paid request succeeds', async () => {
    const origEnv = process.env['X402_PAYMENT_HEADER'];
    process.env['X402_PAYMENT_HEADER'] = 'test-token';

    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 100,
    });
    mockedSendPaid.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"data":"ok"}',
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', { ...defaultOptions, pay: true });
    const paymentRule = result.rules.find((r) => r.id === 'flow.payment-verified');
    expect(paymentRule?.passed).toBe(true);
    expect(result.paymentFlow?.attempted).toBe(true);
    expect(result.paymentFlow?.passed).toBe(true);

    if (origEnv !== undefined) {
      process.env['X402_PAYMENT_HEADER'] = origEnv;
    } else {
      delete process.env['X402_PAYMENT_HEADER'];
    }
  });

  it('detects rate limiting (429)', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 429,
      headers: { 'retry-after': '30' },
      body: 'Too Many Requests',
      responseTimeMs: 50,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('Rate limited');
    expect(result.errors[0]).toContain('30');
  });

  it('detects HTML response instead of JSON', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<html><body>Not found</body></html>',
      responseTimeMs: 100,
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.errors[0]).toContain('HTML');
  });
});
