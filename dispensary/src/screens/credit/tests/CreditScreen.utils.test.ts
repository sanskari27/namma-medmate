import { describe, expect, it } from 'vitest';
import { agingBucketKey } from '../CreditScreen.utils';

describe('credit aging buckets', () => {
  it('matches /aging D0_30 D31_60 D61_90 D90_PLUS', () => {
    expect(agingBucketKey(0)).toBe('D0_30');
    expect(agingBucketKey(30)).toBe('D0_30');
    expect(agingBucketKey(31)).toBe('D31_60');
    expect(agingBucketKey(60)).toBe('D31_60');
    expect(agingBucketKey(61)).toBe('D61_90');
    expect(agingBucketKey(90)).toBe('D61_90');
    expect(agingBucketKey(91)).toBe('D90_PLUS');
  });
});
