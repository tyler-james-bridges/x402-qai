import type { HttpResponse } from '../types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function sendDiscoveryRequest(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    };
  } finally {
    clearTimeout(timer);
  }
}
