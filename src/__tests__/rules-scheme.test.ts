import { describe, it, expect } from 'vitest';
import { schemeRules } from '../rules/scheme.js';
import type { ScanContext } from '../rules/engine.js';
import type { DiscoveryPayload } from '../types.js';

function makeContext(discoveryOverrides?: Partial<DiscoveryPayload> | null): ScanContext {
  const discovery =
    discoveryOverrides === null
      ? null
      : {
          x402Version: 1,
          scheme: 'exact',
          network: 'base',
          asset: 'USDC',
          amount: '0.01',
          payTo: '0xabc',
          ...discoveryOverrides,
        };
  return {
    url: 'https://example.com/api',
    response: { status: 402, headers: {}, body: '{}' },
    discovery,
    bodyJson: {},
  };
}

function findRule(id: string) {
  const rule = schemeRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('scheme.supported-declared', () => {
  const rule = findRule('scheme.supported-declared');

  it('passes when scheme is declared', () => {
    expect(rule.check(makeContext({ scheme: 'exact' })).passed).toBe(true);
  });

  it('fails when no discovery payload', () => {
    expect(rule.check(makeContext(null)).passed).toBe(false);
  });
});

describe('scheme.network-valid', () => {
  const rule = findRule('scheme.network-valid');

  it('passes for known network "base"', () => {
    expect(rule.check(makeContext({ network: 'base' })).passed).toBe(true);
  });

  it('passes for known network "base-sepolia"', () => {
    expect(rule.check(makeContext({ network: 'base-sepolia' })).passed).toBe(true);
  });

  it('passes case-insensitively', () => {
    expect(rule.check(makeContext({ network: 'Ethereum' })).passed).toBe(true);
  });

  it('fails for unknown network', () => {
    const result = rule.check(makeContext({ network: 'foochain' }));
    expect(result.passed).toBe(false);
    expect(result.suggestion).toContain('base');
  });

  it('fails when no discovery payload', () => {
    expect(rule.check(makeContext(null)).passed).toBe(false);
  });
});
