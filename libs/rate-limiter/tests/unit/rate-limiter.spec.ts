import { describe, expect, it } from 'vitest';
import { TokenBucket } from '../../src/index.ts';

describe('TokenBucket', () => {
  it('allows bursts up to capacity then refills', () => {
    const bucket = new TokenBucket(1, 1, 0);
    expect(bucket.tryRemove(0)).toBe(true);
    expect(bucket.tryRemove(0)).toBe(false);
    expect(bucket.tryRemove(1000)).toBe(true);
  });
});
