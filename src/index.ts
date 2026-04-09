import { sendDiscoveryRequest } from './scanner/http.js';
import { parseDiscoveryResponse } from './scanner/discovery.js';
import { runPaymentFlow } from './scanner/payment.js';
import { allRules, runRules, calculateScore } from './rules/index.js';
import type { ScanContext } from './rules/engine.js';
import type {
  ScanOptions,
  ScanResult,
  DiscoveryPayload,
  PaymentFlowResult,
  RuleResult,
} from './types.js';

export async function scan(url: string, options: ScanOptions): Promise<ScanResult> {
  const errors: string[] = [];

  // Step 1: Discovery request
  let response;
  try {
    response = await sendDiscoveryRequest(url, options.timeout);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    errors.push(`Network error: ${message}`);
    return buildResult(url, [], null, undefined, errors);
  }

  // Step 2: Parse discovery payload
  const discovery = parseDiscoveryResponse(response);

  // Step 3: Payment flow (if --pay)
  const paymentFlow = await runPaymentFlow(url, discovery.payload, options);

  // Step 4: Build context and run rules
  let bodyJson: unknown = null;
  try {
    bodyJson = JSON.parse(response.body);
  } catch {
    // not valid JSON, leave as null
  }

  const context: ScanContext = {
    url,
    response,
    discovery: discovery.payload,
    bodyJson,
    paymentFlow: options.pay ? paymentFlow : undefined,
  };

  const ruleResults = runRules(context, allRules);

  return buildResult(
    url,
    ruleResults,
    discovery.payload,
    options.pay ? paymentFlow : undefined,
    errors,
  );
}

function buildResult(
  url: string,
  rules: RuleResult[],
  discovery: DiscoveryPayload | null,
  paymentFlow: PaymentFlowResult | undefined,
  errors: string[],
): ScanResult {
  const score = calculateScore(rules);
  const hasErrors = rules.some((r) => r.severity === 'error' && !r.passed);
  return {
    url,
    timestamp: new Date().toISOString(),
    passed: !hasErrors && errors.length === 0,
    score,
    rules,
    discovery,
    paymentFlow,
    errors,
  };
}

export type { ScanOptions, ScanResult, RuleResult } from './types.js';
