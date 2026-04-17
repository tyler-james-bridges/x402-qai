import { sendDiscoveryRequest, sendPaidRequest } from './http.js';
import { parseDiscoveryResponse } from './discovery.js';
import type { DiscoveryPayload, HttpResponse } from '../types.js';

export type FlowStepKind =
  | 'discovery-request'
  | 'discovery-response'
  | 'parse-requirements'
  | 'sign-payment'
  | 'paid-request'
  | 'paid-response';

export type FlowStepStatus = 'success' | 'failure' | 'warning' | 'skipped';

export interface FlowStep {
  kind: FlowStepKind;
  label: string;
  status: FlowStepStatus;
  startedAt: number;
  durationMs: number;
  summary: string;
  detail?: Record<string, unknown>;
}

export interface FlowTrace {
  url: string;
  startedAt: string;
  totalDurationMs: number;
  paid: boolean;
  succeeded: boolean;
  steps: FlowStep[];
  discovery: DiscoveryPayload | null;
  errors: string[];
}

export interface TraceFlowOptions {
  timeout: number;
  pay: boolean;
  paymentHeader?: string;
  now?: () => number;
}

function truncate(body: string, max = 500): string {
  if (body.length <= max) return body;
  return `${body.slice(0, max)}... [truncated ${body.length - max} chars]`;
}

function responseDetail(response: HttpResponse): Record<string, unknown> {
  return {
    status: response.status,
    headers: response.headers,
    body: truncate(response.body),
    responseTimeMs: response.responseTimeMs,
  };
}

export async function traceFlow(url: string, options: TraceFlowOptions): Promise<FlowTrace> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const steps: FlowStep[] = [];
  const errors: string[] = [];

  const reqStart = now();
  steps.push({
    kind: 'discovery-request',
    label: 'Client Request',
    status: 'success',
    startedAt: reqStart - startedAt,
    durationMs: 0,
    summary: `GET ${url}`,
    detail: {
      method: 'GET',
      url,
      headers: { Accept: 'application/json' },
    },
  });

  const discoveryResponse = await sendDiscoveryRequest(url, options.timeout);
  const discoveryStep: FlowStep = {
    kind: 'discovery-response',
    label: '402 Response',
    status:
      discoveryResponse.status === 402
        ? 'success'
        : discoveryResponse.status === 200
          ? 'warning'
          : 'failure',
    startedAt: now() - startedAt,
    durationMs: discoveryResponse.responseTimeMs,
    summary: discoveryResponse.error
      ? discoveryResponse.error
      : `${discoveryResponse.status} (${discoveryResponse.responseTimeMs}ms)`,
    detail: responseDetail(discoveryResponse),
  };
  steps.push(discoveryStep);

  if (discoveryResponse.error) {
    errors.push(discoveryResponse.error);
    return {
      url,
      startedAt: new Date(startedAt).toISOString(),
      totalDurationMs: now() - startedAt,
      paid: false,
      succeeded: false,
      steps,
      discovery: null,
      errors,
    };
  }

  const parseStart = now();
  const discovery = parseDiscoveryResponse(discoveryResponse);
  const parseStep: FlowStep = {
    kind: 'parse-requirements',
    label: 'Parse Requirements',
    status: discovery.payload ? 'success' : 'failure',
    startedAt: parseStart - startedAt,
    durationMs: now() - parseStart,
    summary: discovery.payload
      ? `${discovery.payload.amount} ${discovery.payload.asset} on ${discovery.payload.network}`
      : discovery.errors.join('; ') || 'Failed to parse discovery payload',
    detail: discovery.payload
      ? { payload: discovery.payload as unknown as Record<string, unknown> }
      : { errors: discovery.errors },
  };
  steps.push(parseStep);

  if (!discovery.payload) {
    errors.push(...discovery.errors);
    return {
      url,
      startedAt: new Date(startedAt).toISOString(),
      totalDurationMs: now() - startedAt,
      paid: false,
      succeeded: false,
      steps,
      discovery: null,
      errors,
    };
  }

  if (!options.pay || !options.paymentHeader) {
    const skipReason = !options.pay
      ? 'Pay mode disabled. Set pay:true to sign and retry.'
      : 'No payment header supplied. Set X402_PAYMENT_HEADER or pass paymentHeader.';
    steps.push({
      kind: 'sign-payment',
      label: 'Sign Payment',
      status: 'skipped',
      startedAt: now() - startedAt,
      durationMs: 0,
      summary: skipReason,
    });
    steps.push({
      kind: 'paid-request',
      label: 'Retry with Payment',
      status: 'skipped',
      startedAt: now() - startedAt,
      durationMs: 0,
      summary: 'Skipped (not paid)',
    });
    steps.push({
      kind: 'paid-response',
      label: '200 Response',
      status: 'skipped',
      startedAt: now() - startedAt,
      durationMs: 0,
      summary: 'Skipped (not paid)',
    });
    return {
      url,
      startedAt: new Date(startedAt).toISOString(),
      totalDurationMs: now() - startedAt,
      paid: false,
      succeeded: true,
      steps,
      discovery: discovery.payload,
      errors,
    };
  }

  const signStart = now();
  steps.push({
    kind: 'sign-payment',
    label: 'Sign Payment',
    status: 'success',
    startedAt: signStart - startedAt,
    durationMs: 0,
    summary: `Prepared x-payment header (${options.paymentHeader.length} bytes)`,
    detail: {
      scheme: discovery.payload.scheme,
      network: discovery.payload.network,
      amount: discovery.payload.amount,
      asset: discovery.payload.asset,
      payTo: discovery.payload.payTo,
    },
  });

  const paidReqStart = now();
  steps.push({
    kind: 'paid-request',
    label: 'Retry with Payment',
    status: 'success',
    startedAt: paidReqStart - startedAt,
    durationMs: 0,
    summary: `GET ${url} + x-payment`,
    detail: {
      method: 'GET',
      url,
      headers: { Accept: 'application/json', 'x-payment': '<signed>' },
    },
  });

  const paidResponse = await sendPaidRequest(
    url,
    { 'x-payment': options.paymentHeader },
    options.timeout,
  );
  const paidOk = paidResponse.status >= 200 && paidResponse.status < 300;
  steps.push({
    kind: 'paid-response',
    label: paidOk ? '200 Response' : 'Retry Failed',
    status: paidOk ? 'success' : 'failure',
    startedAt: now() - startedAt,
    durationMs: paidResponse.responseTimeMs,
    summary: paidResponse.error
      ? paidResponse.error
      : `${paidResponse.status} (${paidResponse.responseTimeMs}ms)`,
    detail: responseDetail(paidResponse),
  });

  if (paidResponse.error) errors.push(paidResponse.error);

  return {
    url,
    startedAt: new Date(startedAt).toISOString(),
    totalDurationMs: now() - startedAt,
    paid: true,
    succeeded: paidOk && !paidResponse.error,
    steps,
    discovery: discovery.payload,
    errors,
  };
}
