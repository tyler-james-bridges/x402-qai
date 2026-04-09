import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const flowVerified: Rule = {
  id: 'flow.payment-verified',
  title: 'Payment flow verified',
  severity: 'warn',
  category: 'paymentFlow',
  check(context: ScanContext): RuleResult {
    const pf = context.paymentFlow;

    // No payment flow data means pay mode was off - neutral pass
    if (!pf) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: true,
        message: 'Payment flow testing not enabled (use --pay to enable)',
      };
    }

    if (pf.skipped) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: pf.reason ?? 'Payment flow was skipped',
        suggestion: 'Set X402_PAYMENT_HEADER env var or ensure discovery payload is available',
      };
    }

    if (pf.attempted && pf.passed) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: true,
        message: 'Paid request returned 2xx, payment flow verified',
      };
    }

    // attempted but failed, or not attempted due to guardrail
    const errorMsg = pf.errors.length > 0 ? pf.errors.join('; ') : 'Payment flow failed';
    return {
      id: this.id,
      title: this.title,
      severity: 'error',
      passed: false,
      message: errorMsg,
      suggestion: 'Check endpoint payment handling and amount configuration',
    };
  },
};

export const paymentRules: Rule[] = [flowVerified];
