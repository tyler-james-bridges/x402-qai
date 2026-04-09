import type { HttpResponse } from '../types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function categorizeNetworkError(err: unknown): string {
  if (!(err instanceof Error)) return 'Unknown network error';

  const msg = err.message;

  if (msg.includes('ECONNREFUSED')) {
    return `Endpoint is unreachable (connection refused). The server may be down or not listening on the expected port.`;
  }
  if (msg.includes('ENOTFOUND')) {
    return `Endpoint hostname could not be resolved (DNS lookup failed). Check the URL for typos.`;
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ENETUNREACH')) {
    return `Endpoint is unreachable (network timeout). The server may be behind a firewall or the network is unavailable.`;
  }
  if (err.name === 'AbortError' || msg.includes('abort')) {
    return `Request timed out. The server did not respond within the allowed time.`;
  }

  return `Network error: ${msg}`;
}

export async function sendDiscoveryRequest(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await response.text();

    return {
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      body: '',
      responseTimeMs: Date.now() - start,
      error: categorizeNetworkError(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendPaidRequest(
  url: string,
  paymentHeaders: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...paymentHeaders,
      },
    });

    const body = await response.text();

    return {
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
      responseTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      body: '',
      responseTimeMs: Date.now() - start,
      error: categorizeNetworkError(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
