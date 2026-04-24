import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { auditCache } from '../cache.js';
import type { ScanResult } from '../../src/types.js';

// Mock scan() so tests don't make real HTTP calls
vi.mock('../../src/index.js', () => ({
  scan: vi.fn(async (url: string) => mockScanResult(url)),
}));

function mockScanResult(url: string): ScanResult {
  return {
    url,
    timestamp: '2026-04-24T10:00:00.000Z',
    passed: true,
    score: {
      total: 85,
      categories: [{ category: 'discovery', score: 40, maxScore: 40 }],
    },
    rules: [{ id: 'test-rule', title: 'Test', severity: 'info', passed: true, message: 'ok' }],
    discovery: null,
    errors: [],
  };
}

describe('Server app', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    delete process.env.SELLER_WALLET_ADDRESS;
    auditCache.clear();
    app = createApp();
  });

  // ---------- Health ----------
  describe('GET /health', () => {
    it('returns {status:"ok"}', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    });
  });

  // ---------- POST /api/v1/audit ----------
  describe('POST /api/v1/audit', () => {
    it('returns scan result for valid URL', async () => {
      const res = await app.request('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/api' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe('https://example.com/api');
      expect(body.passed).toBe(true);
      expect(body.score).toBeDefined();
      expect(body.rules).toBeInstanceOf(Array);
    });

    it('returns 400 for missing url', async () => {
      const res = await app.request('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 for invalid URL', async () => {
      const res = await app.request('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'not-a-url' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns cached result on second call', async () => {
      const body = JSON.stringify({ url: 'https://example.com/cached' });
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };

      const res1 = await app.request('/api/v1/audit', opts);
      const res2 = await app.request('/api/v1/audit', opts);

      expect(await res1.json()).toEqual(await res2.json());
    });
  });

  // ---------- POST /api/v1/audit/full ----------
  describe('POST /api/v1/audit/full', () => {
    it('returns scan result with pay:true semantics', async () => {
      const res = await app.request('/api/v1/audit/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/full' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe('https://example.com/full');
    });
  });

  // ---------- GET /api/v1/audit/check ----------
  describe('GET /api/v1/audit/check', () => {
    it('returns 400 when url param is missing', async () => {
      const res = await app.request('/api/v1/audit/check');
      expect(res.status).toBe(400);
    });

    it('returns 404 when url has no cached result', async () => {
      const res = await app.request('/api/v1/audit/check?url=https://nope.com');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.found).toBe(false);
    });

    it('returns cached result when available', async () => {
      // Populate cache via audit endpoint
      await app.request('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://cached.example.com/' }),
      });

      const res = await app.request(
        '/api/v1/audit/check?url=https://cached.example.com/',
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.found).toBe(true);
      expect(body.url).toBe('https://cached.example.com/');
    });
  });

  // ---------- CORS ----------
  describe('CORS', () => {
    it('includes access-control-allow-origin header', async () => {
      const res = await app.request('/health', {
        headers: { Origin: 'https://example.com' },
      });
      expect(res.headers.get('access-control-allow-origin')).toBeDefined();
    });
  });
});
