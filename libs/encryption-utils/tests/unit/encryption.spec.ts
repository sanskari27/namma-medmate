import { describe, expect, it } from 'vitest';
import { hashSecret, hmacSha256, sha256, verifySecret } from '../../src/index.ts';

describe('encryption-utils', () => {
  it('hashes and authenticates values', () => {
    expect(sha256('abc')).toHaveLength(64);
    expect(hmacSha256('abc', 'secret')).toHaveLength(64);
    expect(sha256('abc')).not.toBe(hmacSha256('abc', 'secret'));
  });

  it('hashes secrets with bcrypt and verifies them', async () => {
    const hash = await hashSecret('counter-pin');
    expect(hash).not.toBe('counter-pin');
    await expect(verifySecret(hash, 'counter-pin')).resolves.toBe(true);
    await expect(verifySecret(hash, 'wrong')).resolves.toBe(false);
  });
});
