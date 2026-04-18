import { NextRequest, NextResponse } from 'next/server';

interface PaymentRequirements {
  x402Version?: number;
  scheme?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payTo?: string;
  maxTimeoutSeconds?: number;
  mimeType?: string;
  description?: string;
  resource?: string;
  [key: string]: unknown;
}

interface FlowStep {
  id: string;
  label: string;
  status: 'ok' | 'fail' | 'skipped' | 'dryRun';
  detail: string;
  data: Record<string, unknown>;
}

export interface FlowResult {
  url: string;
  timestamp: string;
  steps: FlowStep[];
  requirements: PaymentRequirements | null;
  error: string | null;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function parseDiscovery(body: string): {
  requirements: PaymentRequirements | null;
  parsed: unknown;
  parseError: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    return {
      requirements: null,
      parsed: null,
      parseError: err instanceof Error ? err.message : 'JSON parse failed',
    };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.accepts) && obj.accepts.length > 0) {
      const first = obj.accepts[0];
      if (first && typeof first === 'object') {
        return {
          requirements: first as PaymentRequirements,
          parsed,
          parseError: null,
        };
      }
    }
    if ('scheme' in obj || 'amount' in obj || 'payTo' in obj) {
      return { requirements: obj as PaymentRequirements, parsed, parseError: null };
    }
  }

  return {
    requirements: null,
    parsed,
    parseError: 'Response did not contain x402 payment requirements',
  };
}

export async function POST(request: NextRequest) {
  let url: string;
  try {
    const body = await request.json();
    url = body?.url;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const steps: FlowStep[] = [];
  const startedAt = new Date().toISOString();

  const requestHeaders: Record<string, string> = {
    accept: 'application/json',
    'user-agent': 'x402-qai-flow/1.0',
  };

  steps.push({
    id: 'request',
    label: 'Request Sent',
    status: 'ok',
    detail: `GET ${url}`,
    data: {
      method: 'GET',
      url,
      headers: requestHeaders,
    },
  });

  let resp: Response;
  let responseText = '';
  let responseHeaders: Record<string, string> = {};
  const reqStart = Date.now();

  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    });
    responseHeaders = headersToObject(resp.headers);
    responseText = await resp.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    steps.push({
      id: 'response',
      label: '402 Received',
      status: 'fail',
      detail: `Request failed: ${message}`,
      data: { error: message },
    });
    return NextResponse.json({
      url,
      timestamp: startedAt,
      steps,
      requirements: null,
      error: message,
    } satisfies FlowResult);
  }

  const elapsed = Date.now() - reqStart;
  const bodyPreview = responseText.length > 2000 ? responseText.slice(0, 2000) + '…' : responseText;

  if (resp.status !== 402) {
    steps.push({
      id: 'response',
      label: '402 Received',
      status: 'fail',
      detail: `Got ${resp.status} ${resp.statusText || ''}, expected 402`,
      data: {
        status: resp.status,
        statusText: resp.statusText,
        headers: responseHeaders,
        body: bodyPreview,
        responseTimeMs: elapsed,
      },
    });
    return NextResponse.json({
      url,
      timestamp: startedAt,
      steps,
      requirements: null,
      error: `Endpoint returned ${resp.status}, not 402`,
    } satisfies FlowResult);
  }

  steps.push({
    id: 'response',
    label: '402 Received',
    status: 'ok',
    detail: `402 Payment Required in ${elapsed}ms`,
    data: {
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders,
      body: bodyPreview,
      responseTimeMs: elapsed,
    },
  });

  const { requirements, parsed, parseError } = parseDiscovery(responseText);

  if (!requirements) {
    steps.push({
      id: 'parse',
      label: 'Requirements Parsed',
      status: 'fail',
      detail: parseError ?? 'Could not parse payment requirements',
      data: { parsed, error: parseError },
    });
    return NextResponse.json({
      url,
      timestamp: startedAt,
      steps,
      requirements: null,
      error: parseError,
    } satisfies FlowResult);
  }

  steps.push({
    id: 'parse',
    label: 'Requirements Parsed',
    status: 'ok',
    detail: `${requirements.amount ?? '?'} on ${requirements.network ?? '?'} via ${requirements.scheme ?? '?'}`,
    data: {
      requirements,
      fullDiscovery: parsed,
    },
  });

  steps.push({
    id: 'sign',
    label: 'Payment Signed',
    status: 'dryRun',
    detail: 'Dry run: signature step simulated (no live payment)',
    data: {
      note: 'In a real flow the client would construct and sign an EIP-3009 authorization (for the exact scheme) over the payment requirements and embed it as an X-PAYMENT header.',
      simulatedPayload: {
        scheme: requirements.scheme,
        network: requirements.network,
        asset: requirements.asset,
        payTo: requirements.payTo,
        amount: requirements.amount,
        signature: '0x<simulated>',
      },
    },
  });

  steps.push({
    id: 'submit',
    label: 'Payment Submitted',
    status: 'dryRun',
    detail: 'Dry run: would retry GET with X-PAYMENT header',
    data: {
      method: 'GET',
      url,
      headers: {
        accept: 'application/json',
        'x-payment': '<base64-encoded signed payload>',
      },
    },
  });

  steps.push({
    id: 'result',
    label: 'Response Received',
    status: 'dryRun',
    detail: 'Dry run: a valid payment would return 200 with settlement header',
    data: {
      expectedStatus: 200,
      expectedHeaders: {
        'x-payment-response': '<base64-encoded settlement receipt>',
      },
      note: 'Use the CLI `x402-qai --pay` flag to exercise live payments.',
    },
  });

  return NextResponse.json({
    url,
    timestamp: startedAt,
    steps,
    requirements,
    error: null,
  } satisfies FlowResult);
}
