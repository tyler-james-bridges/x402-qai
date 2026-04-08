import { describe, it, expect } from 'vitest';
import { runRules, calculateScore, getAllRules } from '../rules/engine.js';
import type { Rule, ScanContext } from '../rules/engine.js';
import type { RuleResult } from '../types.js';

function makeContext(overrides?: Partial<ScanContext>): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: '{}',
    },
    discovery: null,
    bodyJson: {},
    ...overrides,
  };
}

function makeRule(overrides?: Partial<Rule>): Rule {
  return {
    id: 'test.rule',
    title: 'Test rule',
    severity: 'error',
    category: 'discovery',
    check(): RuleResult {
      return {
        id: 'test.rule',
        title: 'Test rule',
        severity: 'error',
        passed: true,
        message: 'ok',
      };
    },
    ...overrides,
  };
}

describe('runRules', () => {
  it('executes all provided rules and returns results', () => {
    const rules: Rule[] = [makeRule({ id: 'a.one' }), makeRule({ id: 'b.two' })];
    const results = runRules(makeContext(), rules);
    expect(results).toHaveLength(2);
  });

  it('passes context to each rule check', () => {
    const ctx = makeContext({ url: 'https://special.dev' });
    let receivedUrl = '';
    const rule = makeRule({
      check(context: ScanContext): RuleResult {
        receivedUrl = context.url;
        return { id: 'test.rule', title: '', severity: 'info', passed: true, message: '' };
      },
    });
    runRules(ctx, [rule]);
    expect(receivedUrl).toBe('https://special.dev');
  });

  it('returns empty array for no rules', () => {
    expect(runRules(makeContext(), [])).toEqual([]);
  });
});

describe('calculateScore', () => {
  it('returns 100 when all rules pass', () => {
    const results: RuleResult[] = [
      { id: 'discovery.a', title: '', severity: 'error', passed: true, message: '' },
      { id: 'pricing.a', title: '', severity: 'error', passed: true, message: '' },
      { id: 'scheme.a', title: '', severity: 'error', passed: true, message: '' },
      { id: 'flow.a', title: '', severity: 'error', passed: true, message: '' },
      { id: 'errors.a', title: '', severity: 'error', passed: true, message: '' },
    ];
    const score = calculateScore(results);
    expect(score.total).toBe(100);
  });

  it('returns 0 when all rules fail', () => {
    const results: RuleResult[] = [
      { id: 'discovery.a', title: '', severity: 'error', passed: false, message: '' },
      { id: 'pricing.a', title: '', severity: 'error', passed: false, message: '' },
      { id: 'scheme.a', title: '', severity: 'error', passed: false, message: '' },
      { id: 'flow.a', title: '', severity: 'error', passed: false, message: '' },
      { id: 'errors.a', title: '', severity: 'error', passed: false, message: '' },
    ];
    const score = calculateScore(results);
    expect(score.total).toBe(0);
  });

  it('weights discovery at 30%', () => {
    const results: RuleResult[] = [
      { id: 'discovery.a', title: '', severity: 'error', passed: true, message: '' },
    ];
    const score = calculateScore(results);
    const disc = score.categories.find((c) => c.category === 'discovery');
    expect(disc?.score).toBe(30);
    expect(disc?.maxScore).toBe(30);
  });

  it('weights headers at 25%', () => {
    const results: RuleResult[] = [
      { id: 'pricing.a', title: '', severity: 'error', passed: true, message: '' },
    ];
    const score = calculateScore(results);
    const headers = score.categories.find((c) => c.category === 'headers');
    expect(headers?.score).toBe(25);
  });

  it('weights errorHandling at 20%', () => {
    const results: RuleResult[] = [
      { id: 'errors.a', title: '', severity: 'error', passed: true, message: '' },
    ];
    const score = calculateScore(results);
    const errs = score.categories.find((c) => c.category === 'errorHandling');
    expect(errs?.score).toBe(20);
  });

  it('handles empty results with full score', () => {
    const score = calculateScore([]);
    expect(score.total).toBe(100);
  });

  it('returns all four categories', () => {
    const score = calculateScore([]);
    const cats = score.categories.map((c) => c.category).sort();
    expect(cats).toEqual(['discovery', 'errorHandling', 'headers', 'paymentFlow']);
  });
});

describe('getAllRules', () => {
  it('returns a non-empty array of rules', () => {
    const rules = getAllRules();
    expect(rules.length).toBeGreaterThan(0);
  });

  it('includes rules from all categories', () => {
    const rules = getAllRules();
    const prefixes = new Set(rules.map((r) => r.id.split('.')[0]));
    expect(prefixes.has('discovery')).toBe(true);
    expect(prefixes.has('pricing')).toBe(true);
    expect(prefixes.has('scheme')).toBe(true);
    expect(prefixes.has('errors')).toBe(true);
  });

  it('has unique rule ids', () => {
    const rules = getAllRules();
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
