import { describe, expect, it } from 'vitest';
import { hasNextPage, toOffset } from '../../src/index.ts';

describe('pagination-utils', () => {
  it('computes offsets and next-page flags', () => {
    expect(toOffset({ page: 2, pageSize: 20 })).toBe(20);
    expect(toOffset({ page: 0, pageSize: 0 })).toBe(0);
    expect(hasNextPage(1, 20, 21)).toBe(true);
    expect(hasNextPage(2, 20, 21)).toBe(false);
  });
});
