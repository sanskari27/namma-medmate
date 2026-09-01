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
  it('exposes tenancy error codes', () => {
    expect(ErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(ErrorCode.LOCATION_LIMIT_V1).toBe('LOCATION_LIMIT_V1');
    expect(ErrorCode.PHARMACY_SESSION_REQUIRED).toBe('PHARMACY_SESSION_REQUIRED');
    expect(ErrorCode.INVALID_WHATSAPP_TO).toBe('INVALID_WHATSAPP_TO');
    expect(ErrorCode.WHATSAPP_OTP_UNDELIVERABLE).toBe('WHATSAPP_OTP_UNDELIVERABLE');
    expect(ErrorCode.BEFORE_AFTER_REQUIRED).toBe('BEFORE_AFTER_REQUIRED');
    expect(ErrorCode.SECRET_KEY_FORBIDDEN).toBe('SECRET_KEY_FORBIDDEN');
    expect(ErrorCode.MONEY_OR_STOCK_REQUIRED).toBe('MONEY_OR_STOCK_REQUIRED');
    expect(ErrorCode.INVALID_CEILING).toBe('INVALID_CEILING');
    expect(ErrorCode.INVALID_GST_SLAB).toBe('INVALID_GST_SLAB');
    expect(ErrorCode.UNKNOWN_MODULE).toBe('UNKNOWN_MODULE');
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
