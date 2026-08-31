import { describe, expect, it } from 'vitest';
import { mapVerifiedSession } from '../../src/index.ts';

describe('mapVerifiedSession', () => {
  it('maps a verified session into the success envelope', () => {
    expect(mapVerifiedSession({ sub: 'user-1', issuer: 'iss', audience: 'aud' })).toEqual({
      success: true,
      data: { authenticated: true, sub: 'user-1' },
    });
  });
});
