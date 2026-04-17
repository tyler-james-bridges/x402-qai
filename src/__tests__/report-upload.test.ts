import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadReport } from '../scanner/report-upload.js';
import type { ScanResult } from '../types.js';

const baseResult: ScanResult = {
  url: 'https://example.com/api',
  timestamp: new Date().toISOString(),
  passed: true,
  score: { total: 90, categories: [] },
  rules: [],
  discovery: null,
  errors: [],
};

describe('uploadReport', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('POSTs the scan result and returns the parsed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({
          hash: 'abc123',
          reportUrl: 'https://qai.0x402.sh/report/abc123',
          badgeUrl: 'https://qai.0x402.sh/api/badge/abc123.svg',
        }),
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await uploadReport(baseResult, 'https://qai.0x402.sh/api/report');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://qai.0x402.sh/api/report',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res.hash).toBe('abc123');
    expect(res.reportUrl).toContain('abc123');
  });

  it('throws when upstream responds non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response) as unknown as typeof globalThis.fetch;

    await expect(uploadReport(baseResult, 'https://example.test/api')).rejects.toThrow(/500/);
  });

  it('throws when response body is non-JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html>oops</html>',
    } as Response) as unknown as typeof globalThis.fetch;

    await expect(uploadReport(baseResult, 'https://example.test/api')).rejects.toThrow(/non-JSON/);
  });
});
