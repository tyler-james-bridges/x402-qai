import { describe, it, expect, vi, beforeEach } from 'vitest';
import { facilitatorRules, checkFacilitatorReachable } from '../rules/facilitator.js';
import type { ScanContext } from '../rules/engine.js';
import type { DiscoveryPayload } from '../types.js';

function makeContext(overrides?: Partial<ScanContext>): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 402,
      headers: {},
      body: '{}',
      responseTimeMs: 100,
    },
    discovery: {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc',
      extra: { facilitatorUrl: 'https://facilitator.example.com' },
    },
    bodyJson: {},
    ...overrides,
  };
}

function findRule(id: string) {
  const rule = facilitatorRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('facilitator.url-present', () => {
  const rule = findRule('facilitator.url-present');

  it('passes when facilitatorUrl is in extra', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
    expect(result.message).toContain('facilitator.example.com');
  });

  it('fails when extra is missing', () => {
    const discovery: DiscoveryPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc',
    };
    const result = rule.check(makeContext({ discovery }));
    expect(result.passed).toBe(false);
  });

  it('fails when facilitatorUrl is empty string', () => {
    const discovery: DiscoveryPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc',
      extra: { facilitatorUrl: '' },
    };
    const result = rule.check(makeContext({ discovery }));
    expect(result.passed).toBe(false);
  });

  it('fails when discovery is null', () => {
    const result = rule.check(makeContext({ discovery: null }));
    expect(result.passed).toBe(false);
  });
});

describe('facilitator.url-reachable', () => {
  const rule = findRule('facilitator.url-reachable');

  it('passes when facilitator is reachable', () => {
    const result = rule.check(makeContext({ facilitatorReachable: { ok: true, status: 200 } }));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('200');
  });

  it('fails when facilitator is not reachable', () => {
    const result = rule.check(
      makeContext({
        facilitatorReachable: { ok: false, status: 0, error: 'Connection refused' },
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Connection refused');
  });

  it('fails when no facilitatorUrl to check', () => {
    const result = rule.check(makeContext({ discovery: null }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Skipped');
  });

  it('fails when reachability was not tested', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not tested');
  });
});

describe('checkFacilitatorReachable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok for 200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const result = await checkFacilitatorReachable('https://facilitator.example.com');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('returns ok for 404 response (service is alive)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const result = await checkFacilitatorReachable('https://facilitator.example.com');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(404);
  });

  it('returns not ok for 500 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    const result = await checkFacilitatorReachable('https://facilitator.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns not ok for network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await checkFacilitatorReachable('https://facilitator.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns not ok for timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);
    const result = await checkFacilitatorReachable('https://facilitator.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timed out');
  });
});
