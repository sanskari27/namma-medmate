import { ErrorCode } from '@namma-medmate/constants';
import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  getHttpStatus,
  toErrorBody,
} from '../../src/index.ts';

describe('AppError hierarchy', () => {
  it('preserves code, status, and details', () => {
    const error = new ValidationError('bad', { field: 'email' });
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('maps subclasses to expected statuses', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new ConflictError().statusCode).toBe(409);
    expect(new InternalError().statusCode).toBe(500);
  });
});

describe('toErrorBody', () => {
  it('serializes AppError instances', () => {
    expect(toErrorBody(new NotFoundError('missing'))).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'missing' },
    });
  });

  it('includes i18n_key when AppError provides one', () => {
    const error = new AppError(
      'Pairing invalid',
      ErrorCode.LOCATION_TENANT_MISMATCH,
      403,
      undefined,
      'tenancy.errors.locationTenantMismatch',
    );
    expect(toErrorBody(error)).toEqual({
      success: false,
      error: {
        code: 'LOCATION_TENANT_MISMATCH',
        message: 'Pairing invalid',
        i18n_key: 'tenancy.errors.locationTenantMismatch',
      },
    });
  });

  it('includes details on validation errors', () => {
    expect(toErrorBody(new ValidationError('bad', { field: 'email' })).error.details).toEqual({
      field: 'email',
    });
  });

  it('hides unexpected errors', () => {
    expect(toErrorBody(new Error('boom'))).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
    expect(getHttpStatus(new Error('boom'))).toBe(500);
    expect(getHttpStatus(new UnauthorizedError())).toBe(401);
  });

  it('maps http errors with a status field', () => {
    expect(getHttpStatus({ status: 400, message: 'bad' })).toBe(400);
    expect(toErrorBody({ status: 400, message: 'bad' }).error.code).toBe('VALIDATION_ERROR');
    expect(toErrorBody({ status: 401 }).error).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Request failed',
    });
    expect(toErrorBody({ status: 500, message: 'nope' }).error.code).toBe('INTERNAL_ERROR');
  });
});
