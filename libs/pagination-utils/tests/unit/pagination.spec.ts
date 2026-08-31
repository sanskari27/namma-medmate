import { describe, expect, it } from 'vitest';
import { hasNextPage, toOffset, decodeCursor, encodeCursor } from '../../src/index.ts';

describe('pagination-utils', () => {
  it('computes offsets and next-page flags', () => {
    expect(toOffset({ page: 2, pageSize: 20 })).toBe(20);
    expect(toOffset({ page: 0, pageSize: 0 })).toBe(0);
    expect(hasNextPage(1, 20, 21)).toBe(true);
    expect(hasNextPage(2, 20, 21)).toBe(false);
  });

  it('encodes and decodes a tenant cursor and ignores tampering', () => {
    const tenantId = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
    expect(decodeCursor(encodeCursor(tenantId))).toBe(tenantId);
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(decodeCursor('%%%not-base64%%%')).toBeUndefined();
    expect(decodeCursor(encodeCursor('not-a-uuid'))).toBeUndefined();
  });
});
