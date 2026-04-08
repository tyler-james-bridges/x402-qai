import { DiscoveryPayloadSchema } from '../types.js';
import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const status402: Rule = {
  id: 'discovery.status-402',
  title: 'Response returns valid x402 status',
  severity: 'error',
  category: 'discovery',
  check(context: ScanContext): RuleResult {
    // Accept 402 (payment challenge) or 200 (discovery info endpoint)
    const passed = context.response.status === 402 || context.response.status === 200;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? context.response.status === 402
          ? 'Endpoint correctly returns 402 Payment Required'
          : 'Endpoint returns 200 with x402 discovery info'
        : `Expected status 402 or 200, got ${context.response.status}`,
      suggestion: passed
        ? undefined
        : 'Endpoint should return 402 Payment Required for payment challenges, or 200 with discovery payload for info endpoints',
    };
  },
};

const payloadPresent: Rule = {
  id: 'discovery.payload-present',
  title: 'Response body contains x402 discovery info',
  severity: 'error',
  category: 'discovery',
  check(context: ScanContext): RuleResult {
    const passed = context.discovery !== null;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? 'Discovery payload found in response body'
        : 'No x402 discovery payload found in response body',
      suggestion: passed
        ? undefined
        : 'Return a JSON body with x402 discovery fields (scheme, network, asset, amount, payTo)',
    };
  },
};

const payloadValid: Rule = {
  id: 'discovery.payload-valid',
  title: 'Discovery payload passes schema validation',
  severity: 'error',
  category: 'discovery',
  check(context: ScanContext): RuleResult {
    if (!context.bodyJson || typeof context.bodyJson !== 'object') {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'Response body is not valid JSON or not an object',
        suggestion: 'Return a valid JSON object in the response body',
      };
    }

    // Validate the extracted discovery payload if available, otherwise try raw body
    const candidate = context.discovery ?? context.bodyJson;
    const result = DiscoveryPayloadSchema.safeParse(candidate);
    if (result.success) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: true,
        message: 'Discovery payload passes schema validation',
      };
    }

    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed: false,
      message: `Schema validation failed: ${issues.join('; ')}`,
      suggestion: 'Fix the listed fields to match the x402 discovery schema',
    };
  },
};

export const discoveryRules: Rule[] = [status402, payloadPresent, payloadValid];
