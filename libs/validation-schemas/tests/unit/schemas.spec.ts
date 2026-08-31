import { describe, expect, it } from 'vitest';
import {
  bearerHeaderSchema,
  emailSchema,
  nonEmptyStringSchema,
  paginationQuerySchema,
  uuidSchema,
} from '../../src/index.ts';

describe('validation schemas', () => {
  it('accepts valid uuid and email values', () => {
    expect(uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(emailSchema.parse('a@b.co')).toBe('a@b.co');
    expect(nonEmptyStringSchema.parse('  x  ')).toBe('x');
    expect(bearerHeaderSchema.parse('Bearer token')).toBe('Bearer token');
  });

  it('rejects invalid values', () => {
    expect(() => uuidSchema.parse('bad')).toThrow();
    expect(() => emailSchema.parse('bad')).toThrow();
    expect(() => nonEmptyStringSchema.parse('   ')).toThrow();
    expect(() => bearerHeaderSchema.parse('Basic x')).toThrow();
  });

  it('coerces pagination query defaults', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '2', pageSize: '5' })).toEqual({
      page: 2,
      pageSize: 5,
    });
  });
});
