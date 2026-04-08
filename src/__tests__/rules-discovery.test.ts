import { describe, it, expect } from 'vitest';
import { discoveryRules } from '../rules/discovery.js';
import type { ScanContext } from '../rules/engine.js';

function makeContext(overrides?: Partial<ScanContext>): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: 'base',
        asset: 'USDC',
        amount: '0.01',
        payTo: '0xabc',
      }),
    },
    discovery: {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc',
    },
    bodyJson: {
      x402Version: 1,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      amount: '0.01',
      payTo: '0xabc',
    },
    ...overrides,
  };
}

function findRule(id: string) {
  const rule = discoveryRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('discovery.status-402', () => {
  const rule = findRule('discovery.status-402');

  it('passes when status is 402', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
  });

  it('fails when status is 200', () => {
    const result = rule.check(makeContext({ response: { status: 200, headers: {}, body: '' } }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('200');
  });

  it('fails when status is 500', () => {
    const result = rule.check(makeContext({ response: { status: 500, headers: {}, body: '' } }));
    expect(result.passed).toBe(false);
  });
});

describe('discovery.payload-present', () => {
  const rule = findRule('discovery.payload-present');

  it('passes when discovery payload exists', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
  });

  it('fails when discovery is null', () => {
    const result = rule.check(makeContext({ discovery: null }));
    expect(result.passed).toBe(false);
    expect(result.suggestion).toBeDefined();
  });
});

describe('discovery.payload-valid', () => {
  const rule = findRule('discovery.payload-valid');

  it('passes with valid body json', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
  });

  it('fails when bodyJson is null', () => {
    const result = rule.check(makeContext({ bodyJson: null }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not valid JSON');
  });

  it('fails when bodyJson is not an object', () => {
    const result = rule.check(makeContext({ bodyJson: 'string' }));
    expect(result.passed).toBe(false);
  });

  it('fails when schema validation fails', () => {
    const result = rule.check(makeContext({ bodyJson: { x402Version: -1 } }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Schema validation failed');
  });
});
