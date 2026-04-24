const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface AuditInput {
  url: string;
  timeout: number;
}

export function validateAuditInput(body: unknown): AuditInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const { url, timeout } = body as Record<string, unknown>;

  if (typeof url !== 'string' || url.length === 0) {
    throw new ValidationError('Field "url" is required and must be a non-empty string');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('URL must use http or https protocol');
  }

  let resolvedTimeout = DEFAULT_TIMEOUT_MS;
  if (timeout !== undefined) {
    if (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0) {
      throw new ValidationError('"timeout" must be a positive number (ms)');
    }
    resolvedTimeout = Math.min(timeout, MAX_TIMEOUT_MS);
  }

  return { url: parsed.href, timeout: resolvedTimeout };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
