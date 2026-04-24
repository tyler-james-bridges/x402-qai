import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { scan } from '../src/index.js';
import { AuditCache, auditCache } from './cache.js';
import { validateAuditInput, ValidationError } from './validation.js';
import type { ScanResult } from '../src/types.js';

export function createApp() {
  const app = new Hono();

  // ---------- CORS ----------
  app.use('*', cors());

  // ---------- x402 payment middleware (conditional) ----------
  const sellerWallet = process.env.SELLER_WALLET_ADDRESS;

  if (sellerWallet) {
    const loadMiddleware = async () => {
      const { paymentMiddlewareFromConfig } = await import('@x402/hono');
      const { buildRoutes } = await import('./x402Config.js');
      const routes = buildRoutes(sellerWallet as `0x${string}`);
      return paymentMiddlewareFromConfig(routes);
    };

    const middlewarePromise = loadMiddleware();

    app.use('/api/v1/audit', async (c, next) => {
      const mw = await middlewarePromise;
      return mw(c, next);
    });
    app.use('/api/v1/audit/full', async (c, next) => {
      const mw = await middlewarePromise;
      return mw(c, next);
    });
  }

  // ---------- Health ----------
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // ---------- POST /api/v1/audit — basic scan ($0.05) ----------
  app.post('/api/v1/audit', async (c) => {
    try {
      const body = await c.req.json();
      const { url, timeout } = validateAuditInput(body);

      const cacheKey = AuditCache.key(url, 'basic');
      const cached = auditCache.get(cacheKey) as ScanResult | undefined;
      if (cached) return c.json(cached);

      const result = await scan(url, {
        timeout,
        pay: false,
        format: 'json',
      });

      auditCache.set(cacheKey, result);
      return c.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: msg }, 500);
    }
  });

  // ---------- POST /api/v1/audit/full — full scan ($0.10) ----------
  app.post('/api/v1/audit/full', async (c) => {
    try {
      const body = await c.req.json();
      const { url, timeout } = validateAuditInput(body);

      const cacheKey = AuditCache.key(url, 'full');
      const cached = auditCache.get(cacheKey) as ScanResult | undefined;
      if (cached) return c.json(cached);

      const result = await scan(url, {
        timeout,
        pay: true,
        maxAmount: '0.01',
        format: 'json',
      });

      auditCache.set(cacheKey, result);
      return c.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: msg }, 500);
    }
  });

  // ---------- GET /api/v1/audit/check — free cached lookup ----------
  app.get('/api/v1/audit/check', (c) => {
    const url = c.req.query('url');
    if (!url) {
      return c.json({ error: 'Query parameter "url" is required' }, 400);
    }

    const basic = auditCache.get(AuditCache.key(url, 'basic')) as ScanResult | undefined;
    const full = auditCache.get(AuditCache.key(url, 'full')) as ScanResult | undefined;
    const result = full ?? basic;

    if (!result) {
      return c.json({ found: false, url }, 404);
    }

    return c.json({ found: true, ...result });
  });

  return app;
}
