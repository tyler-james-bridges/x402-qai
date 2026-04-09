import { sendPaidRequest } from './http.js';
import { checkCdpAvailable, getCdpSupported, checkCdpCompatibility } from './cdp.js';
import type { DiscoveryPayload, ScanOptions } from '../types.js';

export interface PaymentFlowResult {
  attempted: boolean;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  errors: string[];
  cdpAvailable?: boolean;
  cdpCompatibility?: {
    compatible: boolean;
    issues: string[];
  };
}

const DEFAULT_MAX_AMOUNT = '0.01';

export async function runPaymentFlow(
  url: string,
  discovery: DiscoveryPayload | null,
  options: ScanOptions,
): Promise<PaymentFlowResult> {
  if (!options.pay) {
    return { attempted: false, passed: false, skipped: true, errors: [] };
  }

  if (!discovery) {
    return {
      attempted: false,
      passed: false,
      skipped: true,
      reason: 'No discovery payload available',
      errors: [],
    };
  }

  // Enforce max amount guardrail
  const maxAmount = parseFloat(options.maxAmount ?? DEFAULT_MAX_AMOUNT);
  const discoveryAmount = parseFloat(discovery.amount);

  if (isNaN(discoveryAmount)) {
    return {
      attempted: false,
      passed: false,
      skipped: false,
      errors: [`Discovery amount "${discovery.amount}" is not a valid number`],
    };
  }

  if (discoveryAmount > maxAmount) {
    return {
      attempted: false,
      passed: false,
      skipped: false,
      errors: [
        `Discovery amount ${discovery.amount} exceeds max allowed ${maxAmount}. Use --max-amount to raise the limit.`,
      ],
    };
  }

  // Strategy 1: Header passthrough from env var
  const paymentHeader = process.env['X402_PAYMENT_HEADER'];
  if (paymentHeader) {
    return runHeaderStrategy(url, paymentHeader, options.timeout);
  }

  // Strategy 2: CDP CLI compatibility check
  const cdpAvailable = await checkCdpAvailable();
  if (cdpAvailable) {
    return runCdpStrategy(discovery);
  }

  // No strategy available
  return {
    attempted: false,
    passed: false,
    skipped: true,
    reason: 'No payment credential configured (set X402_PAYMENT_HEADER or install CDP CLI)',
    errors: [],
    cdpAvailable: false,
  };
}

async function runHeaderStrategy(
  url: string,
  paymentHeader: string,
  timeout: number,
): Promise<PaymentFlowResult> {
  try {
    const response = await sendPaidRequest(url, { 'x-payment': paymentHeader }, timeout);

    const passed = response.status >= 200 && response.status < 300;

    return {
      attempted: true,
      passed,
      skipped: false,
      details: {
        strategy: 'header',
        status: response.status,
        contentType: response.headers['content-type'] ?? null,
      },
      errors: passed ? [] : [`Paid request returned status ${response.status}, expected 2xx`],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      attempted: true,
      passed: false,
      skipped: false,
      errors: [`Payment request failed: ${message}`],
    };
  }
}

async function runCdpStrategy(discovery: DiscoveryPayload): Promise<PaymentFlowResult> {
  try {
    const supported = await getCdpSupported();
    const compatibility = checkCdpCompatibility(discovery, supported);

    return {
      attempted: true,
      passed: compatibility.compatible,
      skipped: false,
      details: {
        strategy: 'cdp',
        supportedSchemes: supported.schemes,
        supportedNetworks: supported.networks,
      },
      errors: compatibility.compatible ? [] : compatibility.issues,
      cdpAvailable: true,
      cdpCompatibility: compatibility,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      attempted: true,
      passed: false,
      skipped: false,
      errors: [`CDP compatibility check failed: ${message}`],
      cdpAvailable: true,
    };
  }
}
