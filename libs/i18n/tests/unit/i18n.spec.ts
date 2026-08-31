import { describe, expect, it } from 'vitest';
import { translate } from '../../src/index.ts';

describe('i18n', () => {
  it('returns a message or fallback', () => {
    expect(translate({ hello: 'Hello' }, 'hello')).toBe('Hello');
    expect(translate({}, 'missing')).toBe('missing');
    expect(translate({}, 'missing', 'n/a')).toBe('n/a');
  });
});
