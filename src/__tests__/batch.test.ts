import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanBatch } from '../batch.js';
import { formatBatchTextReport } from '../reporters/text.js';
import { formatBatchJsonReport } from '../reporters/json.js';
import type { ScanOptions, ScanResult } from '../types.js';

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

function makeScanResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    url: 'https://example.com/api',
    timestamp: '2026-04-08T12:00:00.000Z',
    passed: true,
    score: {
      total: 85,
      categories: [
        { category: 'discovery', score: 40, maxScore: 40 },
        { category: 'headers', score: 15, maxScore: 20 },
        { category: 'paymentFlow', score: 20, maxScore: 25 },
        { category: 'errorHandling', score: 10, maxScore: 15 },
      ],
    },
    rules: [],
    discovery: null,
    errors: [],
    ...overrides,
  };
}

describe('scanBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scans multiple URLs and returns results for each', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
    });

    const urls = ['https://a.com/api', 'https://b.com/api', 'https://c.com/api'];
    const results = await scanBatch(urls, defaultOptions);

    expect(results).toHaveLength(3);
    expect(results[0].url).toBe('https://a.com/api');
    expect(results[1].url).toBe('https://b.com/api');
    expect(results[2].url).toBe('https://c.com/api');
  });

  it('returns empty array for empty input', async () => {
    const results = await scanBatch([], defaultOptions);
    expect(results).toEqual([]);
  });

  it('handles mixed pass/fail results', async () => {
    mockedSendDiscovery
      .mockResolvedValueOnce({
        status: 402,
        headers: { 'content-type': 'application/json' },
        body: validPayload(),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: 'OK',
      });

    const urls = ['https://good.com/api', 'https://bad.com/api'];
    const results = await scanBatch(urls, defaultOptions);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  it('continues scanning after a network error', async () => {
    mockedSendDiscovery.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
    });

    const urls = ['https://down.com/api', 'https://up.com/api'];
    const results = await scanBatch(urls, defaultOptions);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(false);
    expect(results[0].errors[0]).toContain('ECONNREFUSED');
    expect(results[1].passed).toBe(true);
  });

  it('executes scans sequentially', async () => {
    const callOrder: number[] = [];
    mockedSendDiscovery.mockImplementation(async () => {
      callOrder.push(callOrder.length);
      return {
        status: 402,
        headers: { 'content-type': 'application/json' },
        body: validPayload(),
      };
    });

    await scanBatch(['https://a.com', 'https://b.com', 'https://c.com'], defaultOptions);

    expect(callOrder).toEqual([0, 1, 2]);
    expect(mockedSendDiscovery).toHaveBeenCalledTimes(3);
  });
});

describe('formatBatchTextReport', () => {
  it('includes per-URL summary lines', () => {
    const results = [
      makeScanResult({ url: 'https://a.com', score: { total: 90, categories: [] } }),
      makeScanResult({ url: 'https://b.com', passed: false, score: { total: 40, categories: [] } }),
    ];
    const output = formatBatchTextReport(results);

    expect(output).toContain('https://a.com');
    expect(output).toContain('https://b.com');
    expect(output).toContain('90/100');
    expect(output).toContain('40/100');
    expect(output).toContain('Batch Summary');
  });

  it('shows correct passed count', () => {
    const results = [
      makeScanResult({ url: 'https://a.com' }),
      makeScanResult({ url: 'https://b.com', passed: false }),
      makeScanResult({ url: 'https://c.com' }),
    ];
    const output = formatBatchTextReport(results);
    expect(output).toContain('2/3 passed');
  });

  it('shows average score', () => {
    const results = [
      makeScanResult({ score: { total: 80, categories: [] } }),
      makeScanResult({ score: { total: 60, categories: [] } }),
    ];
    const output = formatBatchTextReport(results);
    expect(output).toContain('average score: 70/100');
  });

  it('uses threshold for pass/fail when provided', () => {
    const results = [
      makeScanResult({ url: 'https://a.com', passed: true, score: { total: 65, categories: [] } }),
    ];
    const output = formatBatchTextReport(results, 70);
    expect(output).toContain('FAIL');
    expect(output).toContain('0/1 passed');
  });
});

describe('formatBatchJsonReport', () => {
  it('returns valid JSON with batch metadata', () => {
    const results = [
      makeScanResult({ url: 'https://a.com' }),
      makeScanResult({ url: 'https://b.com', passed: false }),
    ];
    const output = formatBatchJsonReport(results);
    const parsed = JSON.parse(output);

    expect(parsed.version).toBe('0.1.0');
    expect(parsed.totalUrls).toBe(2);
    expect(parsed.passed).toBe(1);
    expect(parsed.failed).toBe(1);
    expect(parsed.results).toHaveLength(2);
  });

  it('calculates average score', () => {
    const results = [
      makeScanResult({ score: { total: 80, categories: [] } }),
      makeScanResult({ score: { total: 60, categories: [] } }),
    ];
    const parsed = JSON.parse(formatBatchJsonReport(results));
    expect(parsed.averageScore).toBe(70);
  });

  it('handles empty results', () => {
    const parsed = JSON.parse(formatBatchJsonReport([]));
    expect(parsed.totalUrls).toBe(0);
    expect(parsed.passed).toBe(0);
    expect(parsed.failed).toBe(0);
    expect(parsed.averageScore).toBe(0);
    expect(parsed.results).toEqual([]);
  });
});
