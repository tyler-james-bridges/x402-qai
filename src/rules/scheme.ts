import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const KNOWN_NETWORKS = new Set([
  'base',
  'base-sepolia',
  'ethereum',
  'sepolia',
  'optimism',
  'arbitrum',
  'polygon',
  'solana',
]);

const supportedDeclared: Rule = {
  id: 'scheme.supported-declared',
  title: 'At least one payment scheme declared',
  severity: 'error',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    if (!context.discovery) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'No discovery payload to check payment scheme',
        suggestion: 'Ensure the 402 response includes a discovery payload with a scheme field',
      };
    }

    const passed = context.discovery.scheme.length > 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Payment scheme declared: ${context.discovery.scheme}`
        : 'No payment scheme declared',
      suggestion: passed
        ? undefined
        : 'Include a scheme field indicating the payment protocol (e.g. "exact")',
    };
  },
};

const networkValid: Rule = {
  id: 'scheme.network-valid',
  title: 'Network identifier is recognizable',
  severity: 'warn',
  category: 'headers',
  check(context: ScanContext): RuleResult {
    if (!context.discovery) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'No discovery payload to check network',
      };
    }

    const network = context.discovery.network.toLowerCase();
    const passed = KNOWN_NETWORKS.has(network);
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Network "${context.discovery.network}" is recognized`
        : `Network "${context.discovery.network}" is not a commonly known network`,
      suggestion: passed
        ? undefined
        : `Consider using a well-known network identifier: ${[...KNOWN_NETWORKS].join(', ')}`,
    };
  },
};

export const schemeRules: Rule[] = [supportedDeclared, networkValid];
