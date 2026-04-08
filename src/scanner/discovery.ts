import { DiscoveryPayloadSchema } from '../types.js';
import type { DiscoveryPayload, HttpResponse } from '../types.js';

export interface DiscoveryResult {
  payload: DiscoveryPayload | null;
  errors: string[];
}

export function parseDiscoveryResponse(response: HttpResponse): DiscoveryResult {
  if (response.status !== 402) {
    return {
      payload: null,
      errors: [
        `Expected status 402 but got ${response.status}. Endpoint must return 402 Payment Required for unauthenticated requests.`,
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    return {
      payload: null,
      errors: ['Response body is not valid JSON.'],
    };
  }

  // x402 payloads can be at the top level or nested under an "accepts" array
  const candidate = extractCandidate(parsed);
  if (!candidate) {
    return {
      payload: null,
      errors: [
        "No x402 discovery payload found. Expected a JSON object with x402Version, scheme, network, asset, amount, and payTo fields, or an 'accepts' array containing such objects.",
      ],
    };
  }

  const result = DiscoveryPayloadSchema.safeParse(candidate);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return {
      payload: null,
      errors: issues,
    };
  }

  return {
    payload: result.data,
    errors: [],
  };
}

function extractCandidate(parsed: unknown): unknown | null {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // Direct payload at top level
  if ('x402Version' in obj && 'scheme' in obj) {
    return obj;
  }

  // Nested under "accepts" array (common x402 pattern)
  if (Array.isArray(obj.accepts) && obj.accepts.length > 0) {
    return obj.accepts[0];
  }

  return null;
}
