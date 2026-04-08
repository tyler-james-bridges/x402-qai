import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const amountValid: Rule = {
  id: 'pricing.amount-valid',
  title: 'Amount is a positive number',
  severity: 'error',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    if (!context.discovery) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'No discovery payload to validate amount',
        suggestion: 'Ensure the 402 response includes a discovery payload with an amount field',
      };
    }

    const num = Number(context.discovery.amount);
    const passed = !Number.isNaN(num) && num > 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Amount ${context.discovery.amount} is a valid positive number`
        : `Amount "${context.discovery.amount}" is not a valid positive number`,
      suggestion: passed ? undefined : 'Set amount to a positive numeric string (e.g. "0.01")',
    };
  },
};

const amountFormat: Rule = {
  id: 'pricing.amount-format',
  title: 'Amount has valid decimal format',
  severity: 'warn',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    if (!context.discovery) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'No discovery payload to validate amount format',
      };
    }

    const passed = /^\d+(\.\d+)?$/.test(context.discovery.amount);
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Amount "${context.discovery.amount}" has valid decimal format`
        : `Amount "${context.discovery.amount}" has unexpected format`,
      suggestion: passed
        ? undefined
        : 'Use a simple decimal format like "1" or "0.01" without leading zeros or scientific notation',
    };
  },
};

const assetPresent: Rule = {
  id: 'pricing.asset-present',
  title: 'Asset/token identifier is present',
  severity: 'error',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    if (!context.discovery) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'No discovery payload to validate asset field',
        suggestion: 'Ensure the 402 response includes a discovery payload with an asset field',
      };
    }

    const passed = context.discovery.asset.length > 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Asset identifier present: ${context.discovery.asset}`
        : 'Asset identifier is missing or empty',
      suggestion: passed
        ? undefined
        : 'Include an asset field identifying the payment token (e.g. a contract address or symbol)',
    };
  },
};

export const pricingRules: Rule[] = [amountValid, amountFormat, assetPresent];
