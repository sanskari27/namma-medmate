import { describe, expect, it } from 'vitest';
import { MemoryCache } from '../../src/index.ts';

describe('MemoryCache', () => {
  it('stores and expires values', () => {
    const cache = new MemoryCache<string>(10);
    cache.set('a', '1', 0);
    expect(cache.get('a', 5)).toBe('1');
    expect(cache.get('a', 11)).toBeUndefined();
    expect(cache.get('missing')).toBeUndefined();
  });
});
