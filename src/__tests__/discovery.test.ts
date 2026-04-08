import { describe, it, expect } from 'vitest';
import { parseDiscoveryResponse } from '../scanner/discovery.js';
import type { HttpResponse } from '../types.js';

function makeResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
  return {
    status: 402,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: 'base-sepolia',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc123',
    }),
    ...overrides,
  };
}

describe('parseDiscoveryResponse', () => {
  it('parses a valid discovery payload', () => {
    const result = parseDiscoveryResponse(makeResponse());
    expect(result.errors).toEqual([]);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.scheme).toBe('exact');
    expect(result.payload?.amount).toBe('0.01');
  });

  it('returns error for non-402 status', () => {
    const result = parseDiscoveryResponse(makeResponse({ status: 200 }));
    expect(result.payload).toBeNull();
    expect(result.errors[0]).toContain('Expected status 402');
  });

  it('returns error for invalid JSON body', () => {
    const result = parseDiscoveryResponse(makeResponse({ body: 'not json' }));
    expect(result.payload).toBeNull();
    expect(result.errors[0]).toContain('not valid JSON');
  });

  it('returns error for missing required fields', () => {
    const result = parseDiscoveryResponse(
      makeResponse({
        body: JSON.stringify({ x402Version: 1, scheme: 'exact' }),
      }),
    );
    expect(result.payload).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles accepts array format', () => {
    const result = parseDiscoveryResponse(
      makeResponse({
        body: JSON.stringify({
          accepts: [
            {
              x402Version: 1,
              scheme: 'exact',
              network: 'base',
              asset: 'USDC',
              amount: '1.00',
              payTo: '0xdef456',
            },
          ],
        }),
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.payload?.network).toBe('base');
  });

  it('returns error for empty object body', () => {
    const result = parseDiscoveryResponse(makeResponse({ body: '{}' }));
    expect(result.payload).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts optional fields', () => {
    const result = parseDiscoveryResponse(
      makeResponse({
        body: JSON.stringify({
          x402Version: 1,
          scheme: 'exact',
          network: 'base',
          asset: 'USDC',
          amount: '0.50',
          payTo: '0xabc',
          maxTimeoutSeconds: 30,
          description: 'Access premium content',
        }),
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.payload?.maxTimeoutSeconds).toBe(30);
    expect(result.payload?.description).toBe('Access premium content');
  });
});
