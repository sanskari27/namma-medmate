import { describe, expect, it } from 'vitest';
import { ErrorCode, HttpStatus, Patterns } from '../../src/index.ts';

describe('HttpStatus', () => {
  it('exposes standard success and error codes', () => {
    expect(HttpStatus.OK).toBe(200);
    expect(HttpStatus.UNAUTHORIZED).toBe(401);
    expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
  });
});

describe('ErrorCode', () => {
  it('uses stable string identifiers', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
  });
});

describe('Patterns', () => {
  it('matches uuid, bearer, and email values', () => {
    expect(Patterns.uuid.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(Patterns.uuid.test('not-a-uuid')).toBe(false);
    expect(Patterns.bearer.test('Bearer abc.def')).toBe(true);
    expect(Patterns.bearer.test('Basic abc')).toBe(false);
    expect(Patterns.email.test('user@example.com')).toBe(true);
    expect(Patterns.email.test('bad')).toBe(false);
  });
});
