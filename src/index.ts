import { sendDiscoveryRequest } from './scanner/http.js';
import { parseDiscoveryResponse } from './scanner/discovery.js';
import { runPaymentFlow } from './scanner/payment.js';
import { runLint } from './scanner/lint.js';
import { allRules, runRules, calculateScore } from './rules/index.js';
import { checkFacilitatorReachable } from './rules/facilitator.js';
import type { ScanContext } from './rules/engine.js';
import type {
  ScanOptions,
  ScanResult,
  DiscoveryPayload,
  PaymentFlowResult,
  LintResult,
  RuleResult,
} from './types.js';

export async function scan(url: string, options: ScanOptions): Promise<ScanResult> {
  const errors: string[] = [];

  // Step 0: Lint (if --lint)
  let lintResult: LintResult | undefined;
  if (options.lint) {
    lintResult = await runLint();
  }

  // Step 1: Discovery request (no longer throws on network errors)
  const response = await sendDiscoveryRequest(url, options.timeout);

  // Check for network-level errors
  if (response.error) {
    errors.push(response.error);
    return buildResult(url, [], null, undefined, lintResult, errors);
  }

  // Check for rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers['retry-after'];
    const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    errors.push(`Rate limited by server (429 Too Many Requests).${retryMsg}`);
    return buildResult(url, [], null, undefined, lintResult, errors);
  }

  // Detect HTML responses when JSON is expected
  const ct = response.headers['content-type'] ?? '';
  if (ct.includes('text/html') && !ct.includes('application/json')) {
    errors.push(
      `Endpoint returned HTML (Content-Type: ${ct}) instead of JSON. This may indicate a wrong URL, a proxy/CDN page, or a misconfigured server.`,
    );
  }

  // Step 2: Parse discovery payload
  const discovery = parseDiscoveryResponse(response);

  // Step 3: Payment flow (if --pay)
  const paymentFlow = await runPaymentFlow(url, discovery.payload, options);

  // Step 4: Check facilitator reachability
  let facilitatorReachable: { ok: boolean; status: number; error?: string } | undefined;
  const facilitatorUrl = discovery.payload?.extra?.['facilitatorUrl'];
  if (typeof facilitatorUrl === 'string' && facilitatorUrl.length > 0) {
    facilitatorReachable = await checkFacilitatorReachable(facilitatorUrl);
  }

  // Step 5: Build context and run rules
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
    facilitatorReachable,
  };

  const ruleResults = runRules(context, allRules);

  return buildResult(
    url,
    ruleResults,
    discovery.payload,
    options.pay ? paymentFlow : undefined,
    lintResult,
    errors,
  );
}

function buildResult(
  url: string,
  rules: RuleResult[],
  discovery: DiscoveryPayload | null,
  paymentFlow: PaymentFlowResult | undefined,
  lint: LintResult | undefined,
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
    lint,
    errors,
  };
}

export type { ScanOptions, ScanResult, RuleResult } from './types.js';
export { traceFlow } from './scanner/flow.js';
export type {
  FlowStep,
  FlowStepKind,
  FlowStepStatus,
  FlowTrace,
  TraceFlowOptions,
} from './scanner/flow.js';
