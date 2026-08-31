import { describe, expect, it } from 'vitest';
import { e2eTags, taggedTitle } from '../../src/tags.ts';

describe('taggedTitle', () => {
  it('returns the name when no tags are given', () => {
    expect(taggedTitle('home is reachable')).toBe('home is reachable');
  });

  it('appends tags for Playwright grep', () => {
    expect(taggedTitle('home is reachable', e2eTags.smoke, e2eTags.a11y)).toBe(
      'home is reachable @smoke @a11y',
    );
  });
});
