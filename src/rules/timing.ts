import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const responseTime: Rule = {
  id: 'timing.response-time',
  title: 'Discovery endpoint response time',
  severity: 'warn',
  category: 'discovery',
  check(context: ScanContext): RuleResult {
    const ms = context.response.responseTimeMs;

    if (ms <= 2000) {
      return {
        id: this.id,
        title: this.title,
        severity: 'info',
        passed: true,
        message: `Response time: ${ms}ms (good)`,
      };
    }

    if (ms <= 5000) {
      return {
        id: this.id,
        title: this.title,
        severity: 'warn',
        passed: false,
        message: `Response time: ${ms}ms (slow, recommend < 2000ms)`,
        suggestion: 'Optimize the discovery endpoint to respond within 2 seconds',
      };
    }

    return {
      id: this.id,
      title: this.title,
      severity: 'error',
      passed: false,
      message: `Response time: ${ms}ms (very slow, recommend < 2000ms)`,
      suggestion:
        'Discovery endpoint is too slow. Investigate server performance, caching, or network issues.',
    };
  },
};

export const timingRules: Rule[] = [responseTime];
