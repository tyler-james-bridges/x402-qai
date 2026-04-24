import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditCache } from '../cache.js';

describe('AuditCache', () => {
  let cache: AuditCache<string>;

  beforeEach(() => {
    cache = new AuditCache<string>(1000); // 1s TTL for tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nope')).toBeUndefined();
  });

  it('stores and retrieves values', () => {
    cache.set('k1', 'hello');
    expect(cache.get('k1')).toBe('hello');
  });

  it('expires entries after TTL', () => {
    cache.set('k1', 'hello');
    vi.advanceTimersByTime(500);
    expect(cache.get('k1')).toBe('hello'); // still valid

    vi.advanceTimersByTime(600); // now past 1000ms
    expect(cache.get('k1')).toBeUndefined();
  });

  it('has() respects TTL', () => {
    cache.set('k1', 'hello');
    expect(cache.has('k1')).toBe(true);
    vi.advanceTimersByTime(1100);
    expect(cache.has('k1')).toBe(false);
  });

  it('clear() removes all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('size prunes expired entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size).toBe(2);
    vi.advanceTimersByTime(1100);
    expect(cache.size).toBe(0);
  });

  describe('AuditCache.key()', () => {
    it('builds deterministic keys from url + type', () => {
      expect(AuditCache.key('https://ex.com', 'basic')).toBe('basic::https://ex.com');
      expect(AuditCache.key('https://ex.com', 'full')).toBe('full::https://ex.com');
    });

    it('different types produce different keys', () => {
      expect(AuditCache.key('https://ex.com', 'basic')).not.toBe(
        AuditCache.key('https://ex.com', 'full'),
      );
    });
  });
});
