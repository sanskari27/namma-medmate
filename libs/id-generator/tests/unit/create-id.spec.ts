import { describe, expect, it } from 'vitest';
import { createId } from '../../src/index.ts';

describe('createId', () => {
  it('returns a UUID v4', () => {
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('returns unique values', () => {
    expect(createId()).not.toBe(createId());
  });
});
