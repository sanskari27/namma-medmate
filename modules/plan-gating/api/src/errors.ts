import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function planGatingError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
): AppError {
  return new AppError(message, code, status, undefined, i18nKey);
}

export const PlanGatingErrors = {
  validationFailed: (message = 'Validation failed') =>
    planGatingError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'planGating.errors.validationFailed',
    ),
  locationIdRequired: () =>
    planGatingError(
      ErrorCode.LOCATION_ID_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'planGating.errors.locationIdRequired',
    ),
  locationTenantMismatch: () =>
    planGatingError(
      ErrorCode.LOCATION_TENANT_MISMATCH,
      HttpStatus.FORBIDDEN,
      'Location does not belong to this pharmacy',
      'planGating.errors.locationTenantMismatch',
    ),
  unknownModule: () =>
    planGatingError(
      ErrorCode.UNKNOWN_MODULE,
      HttpStatus.BAD_REQUEST,
      'Unknown module_key',
      'planGating.errors.unknownModule',
    ),
  pharmacySessionRequired: () =>
    planGatingError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'planGating.errors.pharmacySessionRequired',
    ),
};
