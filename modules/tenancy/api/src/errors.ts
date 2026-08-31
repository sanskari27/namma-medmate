import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function tenancyError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
): AppError {
  return new AppError(message, code, status, undefined, i18nKey);
}

export const TenancyErrors = {
  validationFailed: (message = 'Validation failed') =>
    tenancyError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'tenancy.errors.validationFailed',
    ),
  displayNameRequired: () =>
    tenancyError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      'Display name is required',
      'tenancy.errors.displayNameRequired',
    ),
  locationIdRequired: () =>
    tenancyError(
      ErrorCode.LOCATION_ID_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'tenancy.errors.locationIdRequired',
    ),
  pharmacyNotFound: () =>
    tenancyError(
      ErrorCode.PHARMACY_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Pharmacy not found',
      'tenancy.errors.pharmacyNotFound',
    ),
  locationNotFound: () =>
    tenancyError(
      ErrorCode.LOCATION_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Location not found',
      'tenancy.errors.locationNotFound',
    ),
  locationTenantMismatch: () =>
    tenancyError(
      ErrorCode.LOCATION_TENANT_MISMATCH,
      HttpStatus.FORBIDDEN,
      'Location does not belong to this pharmacy',
      'tenancy.errors.locationTenantMismatch',
    ),
  locationLimitV1: () =>
    tenancyError(
      ErrorCode.LOCATION_LIMIT_V1,
      HttpStatus.CONFLICT,
      'This pharmacy already has its location. Extra branches are not available.',
      'tenancy.errors.locationLimitV1',
    ),
  forbiddenRole: () =>
    tenancyError(
      ErrorCode.FORBIDDEN_ROLE,
      HttpStatus.FORBIDDEN,
      'Only the Owner can update shop identity',
      'tenancy.errors.forbiddenRole',
    ),
  hqOnly: () =>
    tenancyError(
      ErrorCode.HQ_ONLY,
      HttpStatus.FORBIDDEN,
      'This endpoint is for Platform Admin HQ principals',
      'tenancy.errors.hqOnly',
    ),
  pharmacySessionRequired: () =>
    tenancyError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'tenancy.errors.pharmacySessionRequired',
    ),
};
