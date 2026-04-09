import type { RuleResult } from '../types.js';
import type { Rule, ScanContext } from './engine.js';

const facilitatorUrlPresent: Rule = {
  id: 'facilitator.url-present',
  title: 'Facilitator URL is present in discovery payload',
  severity: 'warn',
  category: 'paymentFlow',
  check(context: ScanContext): RuleResult {
    const extra = context.discovery?.extra;
    const url = extra?.['facilitatorUrl'];
    const passed = typeof url === 'string' && url.length > 0;
    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed,
      message: passed
        ? `Facilitator URL found: ${url}`
        : 'No facilitatorUrl found in discovery payload extra field',
      suggestion: passed
        ? undefined
        : 'Include extra.facilitatorUrl in the discovery payload so clients know which facilitator to use',
    };
  },
};

const facilitatorUrlReachable: Rule = {
  id: 'facilitator.url-reachable',
  title: 'Facilitator URL is reachable',
  severity: 'warn',
  category: 'paymentFlow',
  check(context: ScanContext): RuleResult {
    const extra = context.discovery?.extra;
    const url = extra?.['facilitatorUrl'];

    if (typeof url !== 'string' || url.length === 0) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'Skipped: no facilitatorUrl to check',
      };
    }

    // Reachability is checked asynchronously before rule execution.
    // The result is stored in context.facilitatorReachable by the scan function.
    const reachable = context.facilitatorReachable;
    if (reachable === undefined) {
      return {
        id: this.id,
        title: this.title,
        severity: this.severity,
        passed: false,
        message: 'Facilitator reachability was not tested',
      };
    }

    return {
      id: this.id,
      title: this.title,
      severity: this.severity,
      passed: reachable.ok,
      message: reachable.ok
        ? `Facilitator URL is reachable (status ${reachable.status})`
        : `Facilitator URL is not reachable: ${reachable.error}`,
      suggestion: reachable.ok
        ? undefined
        : 'Verify the facilitatorUrl is correct and the facilitator service is running',
    };
  },
};

export async function checkFacilitatorReachable(
  url: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 2xx or 4xx means the service is alive
    if (response.status < 500) {
      return { ok: true, status: response.status };
    }
    return {
      ok: false,
      status: response.status,
      error: `Server error (status ${response.status})`,
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (err instanceof Error && (err.name === 'AbortError' || message.includes('abort'))) {
      return { ok: false, status: 0, error: 'Request timed out after 5s' };
    }
    return { ok: false, status: 0, error: message };
  }
}

export const facilitatorRules: Rule[] = [facilitatorUrlPresent, facilitatorUrlReachable];
