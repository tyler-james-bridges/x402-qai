import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const corsAllowed: Rule = {
  id: 'headers.cors-allowed',
  title: 'Access-Control-Allow-Origin header is present',
  severity: 'warn',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    const header = context.response.headers['access-control-allow-origin'];
    const passed = header !== undefined && header !== '';
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `CORS header present: ${header}`
        : 'No Access-Control-Allow-Origin header found',
      suggestion: passed
        ? undefined
        : 'Add an Access-Control-Allow-Origin header so browser-based clients can call this endpoint',
    };
  },
};

const contentTypeJson: Rule = {
  id: 'headers.content-type-json',
  title: 'Content-Type is application/json',
  severity: 'warn',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    const ct = context.response.headers['content-type'] ?? '';
    const passed = ct.includes('application/json');
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? 'Content-Type is application/json'
        : `Content-Type is "${ct || '(not set)'}" instead of application/json`,
      suggestion: passed
        ? undefined
        : 'Set the Content-Type header to application/json for x402 discovery responses',
    };
  },
};

const cacheControl: Rule = {
  id: 'headers.cache-control',
  title: 'Cache-Control header exists for discovery endpoint',
  severity: 'info',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    const header = context.response.headers['cache-control'];
    const passed = header !== undefined && header !== '';
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Cache-Control header present: ${header}`
        : 'No Cache-Control header found on discovery endpoint',
      suggestion: passed
        ? undefined
        : 'Consider adding a Cache-Control header to help clients cache discovery responses appropriately',
    };
  },
};

export const headerRules: Rule[] = [corsAllowed, contentTypeJson, cacheControl];
