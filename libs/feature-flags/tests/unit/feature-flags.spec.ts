import { describe, expect, it } from 'vitest';
import { MemoryFlagProvider, createFeatureFlags } from '../../src/index.ts';

describe('feature-flags', () => {
  it('reads flags from a memory provider', async () => {
    const flags = createFeatureFlags(new MemoryFlagProvider({ 'auth.session': true }));
    expect(await flags.isEnabled('auth.session')).toBe(true);
    expect(await flags.isEnabled('missing', true)).toBe(true);
    expect(await flags.isEnabled('missing')).toBe(false);
  });
});
