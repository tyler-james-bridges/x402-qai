import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const LEAK_PATTERNS = [
  /at\s+\S+\s+\(\/[^)]+\)/i, // stack trace with file path
  /\/home\/\w+/i,
  /\/Users\/\w+/i,
  /\/var\/\w+/i,
  /node_modules\//i,
  /Error:\s+.+\.js:\d+/i, // "Error: /path/file.js:42"
  /ECONNREFUSED/i,
  /ENOENT/i,
];

const clearMessage: Rule = {
  id: 'errors.clear-message',
  title: 'Error responses include actionable message',
  severity: 'warn',
  category: 'errorHandling',
  check(context: ScanContext): RuleResult {
    // Only check non-success responses that are not 402
    if (
      context.response.status === 402 ||
      (context.response.status >= 200 && context.response.status < 300)
    ) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: true,
        message: 'Not an error response, rule not applicable',
      };
    }

    const body = context.response.body.trim();
    const passed = body.length > 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? 'Error response includes a message body'
        : 'Error response has no body, making it hard for clients to diagnose issues',
      suggestion: passed
        ? undefined
        : 'Include a human-readable error message in the response body',
    };
  },
};

const noServerLeak: Rule = {
  id: 'errors.no-server-leak',
  title: 'No stack traces or internal paths leaked',
  severity: 'error',
  category: 'errorHandling',
  check(context: ScanContext): RuleResult {
    const body = context.response.body;
    const leaks: string[] = [];

    for (const pattern of LEAK_PATTERNS) {
      if (pattern.test(body)) {
        leaks.push(pattern.source);
      }
    }

    const passed = leaks.length === 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? 'No internal server details leaked in response body'
        : `Response body contains potential server information leaks (${leaks.length} pattern(s) matched)`,
      suggestion: passed
        ? undefined
        : 'Remove stack traces, internal file paths, and system error codes from response bodies',
    };
  },
};

export const errorRules: Rule[] = [clearMessage, noServerLeak];
