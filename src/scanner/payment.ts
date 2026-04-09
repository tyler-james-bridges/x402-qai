import { sendPaidRequest } from './http.js';
import type { DiscoveryPayload, ScanOptions } from '../types.js';

export interface PaymentFlowResult {
  attempted: boolean;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  errors: string[];
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

  // Check for payment header from env
  const paymentHeader = process.env['X402_PAYMENT_HEADER'];
  if (!paymentHeader) {
    return {
      attempted: false,
      passed: false,
      skipped: true,
      reason: 'No payment credential configured',
      errors: [],
    };
  }

  // Send paid request
  try {
    const response = await sendPaidRequest(url, { 'x-payment': paymentHeader }, options.timeout);

    const passed = response.status >= 200 && response.status < 300;

    return {
      attempted: true,
      passed,
      skipped: false,
      details: {
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
