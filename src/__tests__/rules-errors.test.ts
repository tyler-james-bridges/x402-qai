import { describe, it, expect } from 'vitest';
import { errorRules } from '../rules/errors.js';
import type { ScanContext } from '../rules/engine.js';
import type { HttpResponse } from '../types.js';

function makeContext(responseOverrides?: Partial<HttpResponse>): ScanContext {
  return {
    url: 'https://example.com/api',
    response: {
      status: 500,
      headers: {},
      body: 'Internal Server Error',
      responseTimeMs: 100,
      ...responseOverrides,
    },
    discovery: null,
    bodyJson: null,
  };
}

function findRule(id: string) {
  const rule = errorRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return rule;
}

describe('errors.clear-message', () => {
  const rule = findRule('errors.clear-message');

  it('passes for non-empty error body', () => {
    expect(rule.check(makeContext({ status: 500, body: 'Something went wrong' })).passed).toBe(
      true,
    );
  });

  it('fails for empty error body', () => {
    expect(rule.check(makeContext({ status: 500, body: '' })).passed).toBe(false);
  });

  it('passes (not applicable) for 402 responses', () => {
    const result = rule.check(makeContext({ status: 402, body: '' }));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('not applicable');
  });

  it('passes (not applicable) for 200 responses', () => {
    const result = rule.check(makeContext({ status: 200, body: '' }));
    expect(result.passed).toBe(true);
  });

  it('checks 404 responses', () => {
    expect(rule.check(makeContext({ status: 404, body: 'Not found' })).passed).toBe(true);
  });
});

describe('errors.no-server-leak', () => {
  const rule = findRule('errors.no-server-leak');

  it('passes for clean response body', () => {
    expect(rule.check(makeContext({ body: 'Something went wrong' })).passed).toBe(true);
  });

  it('fails when body contains stack trace', () => {
    const body = 'Error at Object.main (/home/user/app/server.js:42:10)';
    expect(rule.check(makeContext({ body })).passed).toBe(false);
  });

  it('fails when body contains /Users path', () => {
    expect(rule.check(makeContext({ body: '/Users/admin/.env' })).passed).toBe(false);
  });

  it('fails when body contains node_modules', () => {
    expect(rule.check(makeContext({ body: 'at node_modules/express/lib/router.js' })).passed).toBe(
      false,
    );
  });

  it('fails when body contains ECONNREFUSED', () => {
    expect(rule.check(makeContext({ body: 'ECONNREFUSED 127.0.0.1:5432' })).passed).toBe(false);
  });

  it('passes for safe error message', () => {
    expect(rule.check(makeContext({ body: '{"error": "Payment required"}' })).passed).toBe(true);
  });
});
