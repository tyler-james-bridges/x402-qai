import { describe, it, expect } from 'vitest';
import { headerRules } from '../rules/headers.js';
import type { ScanContext } from '../rules/engine.js';
import type { HttpResponse } from '../types.js';

function makeContext(responseOverrides?: Partial<HttpResponse>): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 402,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'cache-control': 'no-cache',
      },
      body: '{}',
      responseTimeMs: 100,
      ...responseOverrides,
    },
    discovery: null,
    bodyJson: {},
  };
}

function findRule(id: string) {
  const rule = headerRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('headers.cors-allowed', () => {
  const rule = findRule('headers.cors-allowed');

  it('passes when CORS header is present', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
    expect(result.message).toContain('*');
  });

  it('fails when CORS header is missing', () => {
    const result = rule.check(makeContext({ headers: {} }));
    expect(result.passed).toBe(false);
    expect(result.suggestion).toBeDefined();
  });

  it('fails when CORS header is empty', () => {
    const result = rule.check(makeContext({ headers: { 'access-control-allow-origin': '' } }));
    expect(result.passed).toBe(false);
  });
});

describe('headers.content-type-json', () => {
  const rule = findRule('headers.content-type-json');

  it('passes when Content-Type is application/json', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
  });

  it('passes when Content-Type includes application/json with charset', () => {
    const result = rule.check(
      makeContext({ headers: { 'content-type': 'application/json; charset=utf-8' } }),
    );
    expect(result.passed).toBe(true);
  });

  it('fails when Content-Type is text/html', () => {
    const result = rule.check(makeContext({ headers: { 'content-type': 'text/html' } }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('text/html');
  });

  it('fails when Content-Type is missing', () => {
    const result = rule.check(makeContext({ headers: {} }));
    expect(result.passed).toBe(false);
    expect(result.message).toContain('(not set)');
  });
});

describe('headers.cache-control', () => {
  const rule = findRule('headers.cache-control');

  it('passes when Cache-Control is present', () => {
    const result = rule.check(makeContext());
    expect(result.passed).toBe(true);
  });

  it('fails when Cache-Control is missing', () => {
    const result = rule.check(makeContext({ headers: {} }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe('info');
  });

  it('fails when Cache-Control is empty', () => {
    const result = rule.check(makeContext({ headers: { 'cache-control': '' } }));
    expect(result.passed).toBe(false);
  });
});
