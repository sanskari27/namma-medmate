import { describe, expect, it } from 'vitest';
import {
  hashSecret,
  hmacSha256,
  openSecret,
  randomTempPassword,
  sealSecret,
  sha256,
  verifySecret,
} from '../../src/index.ts';

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

  it('seals and opens a temp password', () => {
    const sealed = sealSecret('K7mP2xQ9', 'test-secret');
    expect(sealed).not.toContain('K7mP2xQ9');
    expect(openSecret(sealed, 'test-secret')).toBe('K7mP2xQ9');
    expect(() => openSecret('bad', 'test-secret')).toThrow('Invalid sealed secret');
    expect(randomTempPassword(8)).toHaveLength(8);
  });
});
