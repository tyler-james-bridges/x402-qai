import { describe, it, expect } from 'vitest';
import { pricingRules } from '../rules/pricing.js';
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
    response: { status: 402, headers: {}, body: '{}', responseTimeMs: 100 },
    discovery,
    bodyJson: {},
  };
}

function findRule(id: string) {
  const rule = pricingRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('pricing.amount-valid', () => {
  const rule = findRule('pricing.amount-valid');

  it('passes for positive amount', () => {
    expect(rule.check(makeContext({ amount: '1.50' })).passed).toBe(true);
  });

  it('fails for zero amount', () => {
    expect(rule.check(makeContext({ amount: '0' })).passed).toBe(false);
  });

  it('fails for negative amount', () => {
    expect(rule.check(makeContext({ amount: '-5' })).passed).toBe(false);
  });

  it('fails for NaN amount', () => {
    expect(rule.check(makeContext({ amount: 'abc' })).passed).toBe(false);
  });

  it('fails when no discovery payload', () => {
    expect(rule.check(makeContext(null)).passed).toBe(false);
  });
});

describe('pricing.amount-format', () => {
  const rule = findRule('pricing.amount-format');

  it('passes for integer format', () => {
    expect(rule.check(makeContext({ amount: '100' })).passed).toBe(true);
  });

  it('passes for decimal format', () => {
    expect(rule.check(makeContext({ amount: '0.01' })).passed).toBe(true);
  });

  it('fails for negative format', () => {
    expect(rule.check(makeContext({ amount: '-1' })).passed).toBe(false);
  });

  it('fails for scientific notation', () => {
    expect(rule.check(makeContext({ amount: '1e5' })).passed).toBe(false);
  });

  it('fails when no discovery payload', () => {
    expect(rule.check(makeContext(null)).passed).toBe(false);
  });
});

describe('pricing.asset-present', () => {
  const rule = findRule('pricing.asset-present');

  it('passes when asset is set', () => {
    expect(rule.check(makeContext({ asset: '0xUSDC' })).passed).toBe(true);
  });

  it('fails when no discovery payload', () => {
    expect(rule.check(makeContext(null)).passed).toBe(false);
  });
});
