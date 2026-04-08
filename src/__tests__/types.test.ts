import { describe, it, expect } from 'vitest';
import { DiscoveryPayloadSchema } from '../types.js';

describe('DiscoveryPayloadSchema', () => {
  const validPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    asset: '0xUSDC',
    amount: '1000',
    payTo: '0xRecipient',
  };

  it('accepts a minimal valid payload', () => {
    const result = DiscoveryPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = DiscoveryPayloadSchema.safeParse({
      ...validPayload,
      maxTimeoutSeconds: 30,
      mimeType: 'application/json',
      description: 'Premium data',
      resource: '/api/data',
      extra: { foo: 'bar' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const missing = { ...validPayload };
    delete (missing as Record<string, unknown>).scheme;
    const result = DiscoveryPayloadSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('rejects invalid x402Version', () => {
    const result = DiscoveryPayloadSchema.safeParse({
      ...validPayload,
      x402Version: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty strings for required fields', () => {
    const result = DiscoveryPayloadSchema.safeParse({
      ...validPayload,
      payTo: '',
    });
    expect(result.success).toBe(false);
  });
});
