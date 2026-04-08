import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scan } from '../index.js';
import type { ScanOptions } from '../types.js';

vi.mock('../scanner/http.js', () => ({
  sendDiscoveryRequest: vi.fn(),
}));

import { sendDiscoveryRequest } from '../scanner/http.js';

const mockedSendDiscovery = vi.mocked(sendDiscoveryRequest);

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
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(true);
    expect(result.score.total).toBeGreaterThan(0);
    expect(result.discovery).not.toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('fails when endpoint returns 200 instead of 402', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 200,
      headers: {},
      body: 'OK',
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(false);
    const statusRule = result.rules.find((r) => r.id === 'discovery.status-402');
    expect(statusRule?.passed).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    mockedSendDiscovery.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('ECONNREFUSED');
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
    });

    const result = await scan('https://example.com/api', defaultOptions);
    expect(result.timestamp).toBeTruthy();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });
});
