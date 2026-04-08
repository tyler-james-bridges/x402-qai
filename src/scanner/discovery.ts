import { DiscoveryPayloadSchema } from '../types.js';
import type { DiscoveryPayload, HttpResponse } from '../types.js';

export interface DiscoveryResult {
  payload: DiscoveryPayload | null;
  errors: string[];
}

export function parseDiscoveryResponse(response: HttpResponse): DiscoveryResult {
  // Accept both 402 (payment challenge) and 200 (discovery info endpoint)
  if (response.status !== 402 && response.status !== 200) {
    return {
      payload: null,
      errors: [
        `Expected status 402 or 200 but got ${response.status}. Endpoint must return 402 Payment Required for payment challenges or 200 for discovery endpoints.`,
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

  // Direct payload at top level (flat x402 format)
  if ('x402Version' in obj && 'scheme' in obj) {
    return obj;
  }

  // x402 v2 format: accepts array with payment requirements
  // Parent has x402Version, resource, etc. Each accepts entry has scheme, network, asset, amount, payTo
  if (Array.isArray(obj.accepts) && obj.accepts.length > 0) {
    const first = obj.accepts[0] as Record<string, unknown>;
    // Merge parent-level x402Version into the accepts entry
    return {
      ...first,
      x402Version: obj.x402Version ?? first.x402Version,
      resource:
        typeof obj.resource === 'object' && obj.resource !== null
          ? (obj.resource as Record<string, unknown>).url ?? JSON.stringify(obj.resource)
          : (obj.resource ?? first.resource),
    };
  }

  return null;
}
