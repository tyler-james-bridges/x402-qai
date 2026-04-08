import { sendDiscoveryRequest } from './scanner/http.js';
import { parseDiscoveryResponse } from './scanner/discovery.js';
import { allRules, runRules, calculateScore } from './rules/index.js';
import type { ScanContext } from './rules/engine.js';
import type { ScanOptions, ScanResult, DiscoveryPayload, RuleResult } from './types.js';

export async function scan(url: string, options: ScanOptions): Promise<ScanResult> {
  const errors: string[] = [];

  // Step 1: Discovery request
  let response;
  try {
    response = await sendDiscoveryRequest(url, options.timeout);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    errors.push(`Network error: ${message}`);
    return buildResult(url, [], null, errors);
  }

  // Step 2: Parse discovery payload
  const discovery = parseDiscoveryResponse(response);

  // Step 3: Build context and run rules
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
  };

  const ruleResults = runRules(context, allRules);

  return buildResult(url, ruleResults, discovery.payload, errors);
}

function buildResult(
  url: string,
  rules: RuleResult[],
  discovery: DiscoveryPayload | null,
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
    errors,
  };
}

export type { ScanOptions, ScanResult, RuleResult } from './types.js';
