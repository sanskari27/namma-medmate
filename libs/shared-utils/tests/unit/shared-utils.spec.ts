import { describe, expect, it } from 'vitest';
import { compact, invariant } from '../../src/index.ts';

describe('shared-utils', () => {
  it('asserts invariants', () => {
    expect(() => invariant(true, 'unused')).not.toThrow();
    expect(() => invariant(false, 'nope')).toThrow('nope');
  });

  it('compacts nullable arrays', () => {
    expect(compact([1, null, 2, undefined])).toEqual([1, 2]);
  });
});
