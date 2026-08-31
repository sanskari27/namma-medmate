import { describe, expect, it } from 'vitest';
import { buildError, buildPaginated, buildSuccess } from '../../src/index.ts';

describe('response envelope', () => {
  it('builds success without meta', () => {
    expect(buildSuccess({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it('builds success with meta', () => {
    expect(buildSuccess({ id: 1 }, { requestId: 'r1' })).toEqual({
      success: true,
      data: { id: 1 },
      meta: { requestId: 'r1' },
    });
  });

  it('builds error without details', () => {
    expect(buildError('NOT_FOUND', 'missing')).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'missing' },
    });
  });

  it('builds error with details', () => {
    expect(buildError('VALIDATION_ERROR', 'bad', { field: 'id' }).error.details).toEqual({
      field: 'id',
    });
  });

  it('computes pagination meta and guards zero page size', () => {
    expect(buildPaginated(['a'], 1, 10, 25).meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
    expect(buildPaginated([], 1, 0, 0).meta).toMatchObject({ pageSize: 1, totalPages: 0 });
  });
});
