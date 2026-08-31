import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  );
}

export function mapTenancyPersistenceError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError(
      'This pharmacy already has its location. Extra branches are not available.',
      ErrorCode.LOCATION_LIMIT_V1,
      HttpStatus.CONFLICT,
      undefined,
      'tenancy.errors.locationLimitV1',
    );
  }
  throw error;
}
