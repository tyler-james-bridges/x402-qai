import { describe, it, expect } from 'vitest';
import { validateAuditInput, ValidationError } from '../validation.js';

describe('validateAuditInput', () => {
  it('accepts a valid https URL', () => {
    const result = validateAuditInput({ url: 'https://example.com/api' });
    expect(result.url).toBe('https://example.com/api');
    expect(result.timeout).toBe(10_000); // default
  });

  it('accepts a valid http URL', () => {
    const result = validateAuditInput({ url: 'http://localhost:3000/test' });
    expect(result.url).toBe('http://localhost:3000/test');
  });

  it('normalises URL trailing slash', () => {
    const result = validateAuditInput({ url: 'https://example.com' });
    expect(result.url).toBe('https://example.com/');
  });

  it('accepts custom timeout', () => {
    const result = validateAuditInput({ url: 'https://example.com', timeout: 5000 });
    expect(result.timeout).toBe(5000);
  });

  it('caps timeout at 30s', () => {
    const result = validateAuditInput({ url: 'https://example.com', timeout: 60000 });
    expect(result.timeout).toBe(30_000);
  });

  it('throws on missing body', () => {
    expect(() => validateAuditInput(null)).toThrow(ValidationError);
    expect(() => validateAuditInput(undefined)).toThrow(ValidationError);
  });

  it('throws on missing url', () => {
    expect(() => validateAuditInput({})).toThrow(ValidationError);
    expect(() => validateAuditInput({ url: '' })).toThrow(ValidationError);
  });

  it('throws on non-string url', () => {
    expect(() => validateAuditInput({ url: 123 })).toThrow(ValidationError);
  });

  it('throws on invalid URL', () => {
    expect(() => validateAuditInput({ url: 'not-a-url' })).toThrow(ValidationError);
  });

  it('throws on non-http protocol', () => {
    expect(() => validateAuditInput({ url: 'ftp://files.example.com' })).toThrow(ValidationError);
  });

  it('throws on bad timeout', () => {
    expect(() => validateAuditInput({ url: 'https://example.com', timeout: -1 })).toThrow(
      ValidationError,
    );
    expect(() => validateAuditInput({ url: 'https://example.com', timeout: 'slow' })).toThrow(
      ValidationError,
    );
  });
});
