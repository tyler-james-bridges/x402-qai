import type { ScanResult } from '../types.js';

export interface ReportUploadResponse {
  hash: string;
  reportUrl: string;
  badgeUrl?: string;
  embedMarkdown?: string;
}

export async function uploadReport(
  result: ScanResult,
  endpoint: string,
  timeoutMs = 10_000,
): Promise<ReportUploadResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Report upload failed (${response.status}): ${text}`);
    }
    let parsed: ReportUploadResponse;
    try {
      parsed = JSON.parse(text) as ReportUploadResponse;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Report upload returned non-JSON body: ${text.slice(0, 200)}`, {
          cause: err,
        });
      }
      throw err;
    }
    if (!parsed.reportUrl || !parsed.hash) {
      throw new Error(`Report upload response missing reportUrl/hash: ${text}`);
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
