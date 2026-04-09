import { describe, it, expect } from 'vitest';
import { checkCdpCompatibility } from '../scanner/cdp.js';
import type { DiscoveryPayload } from '../types.js';

function makeDiscovery(overrides?: Partial<DiscoveryPayload>): DiscoveryPayload {
  return {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    asset: 'USDC',
    amount: '0.01',
    payTo: '0xabc',
    ...overrides,
  };
}

describe('checkCdpCompatibility', () => {
  it('returns compatible when supported lists are empty', () => {
    const result = checkCdpCompatibility(makeDiscovery(), { schemes: [], networks: [] });
    expect(result.compatible).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('returns compatible when scheme and network match', () => {
    const result = checkCdpCompatibility(makeDiscovery(), {
      schemes: ['exact'],
      networks: ['base'],
    });
    expect(result.compatible).toBe(true);
  });

  it('returns incompatible when scheme does not match', () => {
    const result = checkCdpCompatibility(makeDiscovery({ scheme: 'unknown' }), {
      schemes: ['exact'],
      networks: ['base'],
    });
    expect(result.compatible).toBe(false);
    expect(result.issues[0]).toContain('Scheme');
  });

  it('returns incompatible when network does not match', () => {
    const result = checkCdpCompatibility(makeDiscovery({ network: 'solana' }), {
      schemes: ['exact'],
      networks: ['base', 'ethereum'],
    });
    expect(result.compatible).toBe(false);
    expect(result.issues[0]).toContain('Network');
  });

  it('returns multiple issues when both mismatch', () => {
    const result = checkCdpCompatibility(makeDiscovery({ scheme: 'foo', network: 'bar' }), {
      schemes: ['exact'],
      networks: ['base'],
    });
    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(2);
  });
});
