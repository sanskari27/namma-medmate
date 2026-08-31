import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '@namma-medmate/error-handling';
import { extractBearerToken } from '../../src/index.ts';

describe('extractBearerToken', () => {
  it('returns the token from a Bearer header', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def');
  });

  it('rejects missing or malformed headers', () => {
    expect(() => extractBearerToken(undefined)).toThrow(UnauthorizedError);
    expect(() => extractBearerToken('Basic abc')).toThrow(UnauthorizedError);
    expect(() => extractBearerToken('Bearer')).toThrow(UnauthorizedError);
    expect(() => extractBearerToken('Bearer a b')).toThrow(UnauthorizedError);
  });
});
