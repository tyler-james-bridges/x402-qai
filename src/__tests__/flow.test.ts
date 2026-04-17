import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../scanner/http.js', () => ({
  sendDiscoveryRequest: vi.fn(),
  sendPaidRequest: vi.fn(),
}));

import { traceFlow } from '../scanner/flow.js';
import { sendDiscoveryRequest, sendPaidRequest } from '../scanner/http.js';

const mockedSendDiscovery = vi.mocked(sendDiscoveryRequest);
const mockedSendPaid = vi.mocked(sendPaidRequest);

function validPayload() {
  return JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '0.01',
    payTo: '0xabc123',
  });
}

describe('traceFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('produces six steps when unpaid and 402 received', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: { 'content-type': 'application/json' },
      body: validPayload(),
      responseTimeMs: 42,
    });

    const trace = await traceFlow('https://example.com/api', { timeout: 5000, pay: false });

    expect(trace.steps.map((s) => s.kind)).toEqual([
      'discovery-request',
      'discovery-response',
      'parse-requirements',
      'sign-payment',
      'paid-request',
      'paid-response',
    ]);
    expect(trace.steps[1].status).toBe('success');
    expect(trace.steps[2].status).toBe('success');
    expect(trace.steps[3].status).toBe('skipped');
    expect(trace.paid).toBe(false);
    expect(trace.succeeded).toBe(true);
    expect(trace.discovery?.amount).toBe('0.01');
  });

  it('marks discovery-response as failure on network error', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 0,
      headers: {},
      body: '',
      responseTimeMs: 10,
      error: 'Endpoint is unreachable (connection refused).',
    });

    const trace = await traceFlow('https://example.com/api', { timeout: 5000, pay: false });

    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[1].status).toBe('failure');
    expect(trace.succeeded).toBe(false);
    expect(trace.errors[0]).toContain('unreachable');
  });

  it('marks parse-requirements failure when payload invalid', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: '{"not":"x402"}',
      responseTimeMs: 10,
    });

    const trace = await traceFlow('https://example.com/api', { timeout: 5000, pay: false });
    const parse = trace.steps.find((s) => s.kind === 'parse-requirements');
    expect(parse?.status).toBe('failure');
    expect(trace.succeeded).toBe(false);
  });

  it('completes full paid flow with success on 200', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: validPayload(),
      responseTimeMs: 15,
    });
    mockedSendPaid.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"data":"ok"}',
      responseTimeMs: 22,
    });

    const trace = await traceFlow('https://example.com/api', {
      timeout: 5000,
      pay: true,
      paymentHeader: 'dead.beef.signature',
    });

    expect(trace.paid).toBe(true);
    expect(trace.succeeded).toBe(true);
    const paidRes = trace.steps.find((s) => s.kind === 'paid-response');
    expect(paidRes?.status).toBe('success');
    expect(paidRes?.summary).toContain('200');
  });

  it('marks paid-response failure on non-2xx', async () => {
    mockedSendDiscovery.mockResolvedValue({
      status: 402,
      headers: {},
      body: validPayload(),
      responseTimeMs: 15,
    });
    mockedSendPaid.mockResolvedValue({
      status: 403,
      headers: {},
      body: 'nope',
      responseTimeMs: 22,
    });

    const trace = await traceFlow('https://example.com/api', {
      timeout: 5000,
      pay: true,
      paymentHeader: 'abc',
    });

    const paidRes = trace.steps.find((s) => s.kind === 'paid-response');
    expect(paidRes?.status).toBe('failure');
    expect(trace.succeeded).toBe(false);
  });
});
