import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPaymentFlow } from '../scanner/payment.js';
import type { DiscoveryPayload, ScanOptions } from '../types.js';

vi.mock('../scanner/http.js', () => ({
  sendDiscoveryRequest: vi.fn(),
  sendPaidRequest: vi.fn(),
}));

import { sendPaidRequest } from '../scanner/http.js';

const mockedSendPaid = vi.mocked(sendPaidRequest);

function makeDiscovery(overrides?: Partial<DiscoveryPayload>): DiscoveryPayload {
  return {
    x402Version: 1,
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '0.001',
    payTo: '0xabc123',
    ...overrides,
  };
}

function makeOptions(overrides?: Partial<ScanOptions>): ScanOptions {
  return {
    pay: true,
    timeout: 5000,
    format: 'text',
    ...overrides,
  };
}

describe('runPaymentFlow', () => {
  const originalEnv = process.env['X402_PAYMENT_HEADER'];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['X402_PAYMENT_HEADER'];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['X402_PAYMENT_HEADER'] = originalEnv;
    } else {
      delete process.env['X402_PAYMENT_HEADER'];
    }
  });

  it('returns skipped when pay is false', async () => {
    const result = await runPaymentFlow(
      'https://example.com/api',
      makeDiscovery(),
      makeOptions({ pay: false }),
    );
    expect(result.skipped).toBe(true);
    expect(result.attempted).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it('returns skipped when no discovery payload', async () => {
    const result = await runPaymentFlow('https://example.com/api', null, makeOptions());
    expect(result.skipped).toBe(true);
    expect(result.attempted).toBe(false);
    expect(result.reason).toContain('No discovery payload');
  });

  it('rejects when discovery amount exceeds max', async () => {
    const result = await runPaymentFlow(
      'https://example.com/api',
      makeDiscovery({ amount: '1.00' }),
      makeOptions(),
    );
    expect(result.skipped).toBe(false);
    expect(result.attempted).toBe(false);
    expect(result.errors[0]).toContain('exceeds max');
  });

  it('respects custom maxAmount', async () => {
    process.env['X402_PAYMENT_HEADER'] = 'test-token';
    mockedSendPaid.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
    });

    const result = await runPaymentFlow(
      'https://example.com/api',
      makeDiscovery({ amount: '0.05' }),
      makeOptions({ maxAmount: '0.10' }),
    );
    expect(result.attempted).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('rejects invalid discovery amount', async () => {
    const result = await runPaymentFlow(
      'https://example.com/api',
      makeDiscovery({ amount: 'abc' }),
      makeOptions(),
    );
    expect(result.attempted).toBe(false);
    expect(result.errors[0]).toContain('not a valid number');
  });

  it('returns skipped when no payment header env var', async () => {
    const result = await runPaymentFlow('https://example.com/api', makeDiscovery(), makeOptions());
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('No payment credential');
  });

  it('passes on 2xx response', async () => {
    process.env['X402_PAYMENT_HEADER'] = 'test-token';
    mockedSendPaid.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"data":"ok"}',
    });

    const result = await runPaymentFlow('https://example.com/api', makeDiscovery(), makeOptions());
    expect(result.attempted).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.details?.['status']).toBe(200);
  });

  it('fails on 402 response (payment not accepted)', async () => {
    process.env['X402_PAYMENT_HEADER'] = 'bad-token';
    mockedSendPaid.mockResolvedValue({
      status: 402,
      headers: {},
      body: '{"error":"invalid payment"}',
    });

    const result = await runPaymentFlow('https://example.com/api', makeDiscovery(), makeOptions());
    expect(result.attempted).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('402');
  });

  it('handles network error during paid request', async () => {
    process.env['X402_PAYMENT_HEADER'] = 'test-token';
    mockedSendPaid.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await runPaymentFlow('https://example.com/api', makeDiscovery(), makeOptions());
    expect(result.attempted).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('ECONNREFUSED');
  });

  it('does not leak payment header value in result', async () => {
    process.env['X402_PAYMENT_HEADER'] = 'secret-token-value';
    mockedSendPaid.mockResolvedValue({
      status: 200,
      headers: {},
      body: '{}',
    });

    const result = await runPaymentFlow('https://example.com/api', makeDiscovery(), makeOptions());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secret-token-value');
  });
});
