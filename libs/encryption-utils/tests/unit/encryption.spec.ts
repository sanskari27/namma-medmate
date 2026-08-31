import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256 } from '../../src/index.ts';

describe('encryption-utils', () => {
  it('hashes and authenticates values', () => {
    expect(sha256('abc')).toHaveLength(64);
    expect(hmacSha256('abc', 'secret')).toHaveLength(64);
    expect(sha256('abc')).not.toBe(hmacSha256('abc', 'secret'));
  });
});
