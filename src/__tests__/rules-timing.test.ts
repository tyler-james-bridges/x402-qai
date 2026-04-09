import { describe, it, expect } from 'vitest';
import { timingRules } from '../rules/timing.js';
import type { ScanContext } from '../rules/engine.js';

function makeContext(responseTimeMs: number): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 402,
      headers: {},
      body: '{}',
      responseTimeMs,
    },
    discovery: null,
    bodyJson: {},
  };
}

function findRule(id: string) {
  const rule = timingRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('timing.response-time', () => {
  const rule = findRule('timing.response-time');

  it('passes for fast response (< 2000ms)', () => {
    const result = rule.check(makeContext(500));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('500ms');
    expect(result.message).toContain('good');
  });

  it('passes at boundary (2000ms)', () => {
    const result = rule.check(makeContext(2000));
    expect(result.passed).toBe(true);
  });

  it('warns for slow response (2001-5000ms)', () => {
    const result = rule.check(makeContext(3500));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warn');
    expect(result.message).toContain('3500ms');
    expect(result.message).toContain('slow');
  });

  it('warns at upper boundary (5000ms)', () => {
    const result = rule.check(makeContext(5000));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('warn');
  });

  it('errors for very slow response (> 5000ms)', () => {
    const result = rule.check(makeContext(7000));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('error');
    expect(result.message).toContain('7000ms');
    expect(result.message).toContain('very slow');
  });
});
