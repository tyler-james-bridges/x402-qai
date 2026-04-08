import { describe, it, expect } from 'vitest';
import { formatText } from '../reporters/text.js';
import { formatJson } from '../reporters/json.js';
import type { ScanResult } from '../types.js';

function makeScanResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    url: 'https://example.com/api',
    timestamp: '2026-04-08T12:00:00.000Z',
    passed: true,
    score: {
      total: 85,
      categories: [
        { category: 'discovery', score: 40, maxScore: 40 },
        { category: 'headers', score: 15, maxScore: 20 },
        { category: 'paymentFlow', score: 20, maxScore: 25 },
        { category: 'errorHandling', score: 10, maxScore: 15 },
      ],
    },
    rules: [
      {
        id: 'discovery.402-required',
        title: 'Endpoint returns 402 without payment',
        severity: 'error',
        passed: true,
        message: 'Endpoint correctly returns 402 Payment Required.',
      },
      {
        id: 'pricing.amount-valid',
        title: 'Price amount is valid and positive',
        severity: 'error',
        passed: false,
        message: 'Amount "abc" is not a valid positive number.',
        suggestion: 'Set amount to a positive numeric string (e.g. "0.01").',
      },
    ],
    discovery: null,
    errors: [],
    ...overrides,
  };
}

describe('formatJson', () => {
  it('returns valid JSON with all fields', () => {
    const result = makeScanResult();
    const output = formatJson(result);
    const parsed = JSON.parse(output);

    expect(parsed.url).toBe('https://example.com/api');
    expect(parsed.timestamp).toBe('2026-04-08T12:00:00.000Z');
    expect(parsed.passed).toBe(true);
    expect(parsed.score.total).toBe(85);
    expect(parsed.rules).toHaveLength(2);
    expect(parsed.errors).toEqual([]);
  });

  it('includes version field', () => {
    const result = makeScanResult();
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.version).toBe('0.1.0');
  });

  it('includes scanDuration field', () => {
    const result = makeScanResult();
    const parsed = JSON.parse(formatJson(result, Date.now() - 150));
    expect(typeof parsed.scanDuration).toBe('number');
    expect(parsed.scanDuration).toBeGreaterThanOrEqual(0);
  });

  it('defaults scanDuration to 0 without startTime', () => {
    const result = makeScanResult();
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.scanDuration).toBe(0);
  });

  it('includes rule suggestions in output', () => {
    const result = makeScanResult();
    const parsed = JSON.parse(formatJson(result));
    const failedRule = parsed.rules.find((r: Record<string, unknown>) => !r.passed);
    expect(failedRule.suggestion).toBe('Set amount to a positive numeric string (e.g. "0.01").');
  });

  it('handles results with errors', () => {
    const result = makeScanResult({
      passed: false,
      errors: ['Network error: timeout'],
    });
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.passed).toBe(false);
    expect(parsed.errors).toContain('Network error: timeout');
  });
});

describe('formatText', () => {
  it('includes the URL and timestamp', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('https://example.com/api');
    expect(output).toContain('2026-04-08T12:00:00.000Z');
  });

  it('shows PASS for passing rules', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('[PASS]');
  });

  it('shows FAIL for failing rules with suggestions', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('[FAIL]');
    expect(output).toContain('Set amount to a positive numeric string');
  });

  it('shows score breakdown', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('discovery');
    expect(output).toContain('40/40');
    expect(output).toContain('85/100');
  });

  it('shows WARN for warn-severity rules', () => {
    const result = makeScanResult({
      rules: [
        {
          id: 'scheme.supported-declared',
          title: 'Payment scheme is declared',
          severity: 'warn',
          passed: false,
          message: 'Scheme "custom" is not commonly recognized.',
          suggestion: 'Consider using a standard scheme.',
        },
      ],
    });
    const output = formatText(result);
    expect(output).toContain('[WARN]');
  });

  it('displays errors section when errors exist', () => {
    const result = makeScanResult({
      passed: false,
      errors: ['Network error: connection refused'],
    });
    const output = formatText(result);
    expect(output).toContain('Errors');
    expect(output).toContain('Network error: connection refused');
  });

  it('shows overall FAIL verdict for failing result', () => {
    const result = makeScanResult({ passed: false });
    const output = formatText(result);
    expect(output).toContain('FAIL');
  });

  it('includes x402-scan report header', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('x402-scan report');
  });

  it('includes Score Breakdown section', () => {
    const result = makeScanResult();
    const output = formatText(result);
    expect(output).toContain('Score Breakdown');
  });
});
