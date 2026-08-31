import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function auditError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
): AppError {
  return new AppError(message, code, status, undefined, i18nKey);
}

export const AuditErrors = {
  validationFailed: (message = 'Validation failed') =>
    auditError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'audit.errors.validationFailed',
    ),
  locationIdRequired: () =>
    auditError(
      ErrorCode.LOCATION_ID_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'audit.errors.locationIdRequired',
    ),
  locationNotFound: () =>
    auditError(
      ErrorCode.LOCATION_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Location not found',
      'audit.errors.locationNotFound',
    ),
  locationTenantMismatch: () =>
    auditError(
      ErrorCode.LOCATION_TENANT_MISMATCH,
      HttpStatus.FORBIDDEN,
      'Location does not belong to this pharmacy',
      'audit.errors.locationTenantMismatch',
    ),
  beforeAfterRequired: () =>
    auditError(
      ErrorCode.BEFORE_AFTER_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'before and after snapshots are required',
      'audit.errors.beforeAfterRequired',
    ),
  secretKeyForbidden: () =>
    auditError(
      ErrorCode.SECRET_KEY_FORBIDDEN,
      HttpStatus.BAD_REQUEST,
      'Secret keys are not allowed in snapshots',
      'audit.errors.secretKeyForbidden',
    ),
  actorRequired: () =>
    auditError(
      ErrorCode.ACTOR_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'actor_user_id and actor_role are required',
      'audit.errors.actorRequired',
    ),
  payloadTooLarge: () =>
    auditError(
      ErrorCode.PAYLOAD_TOO_LARGE,
      HttpStatus.BAD_REQUEST,
      'Snapshot exceeds 64 KiB',
      'audit.errors.payloadTooLarge',
    ),
  invalidRange: () =>
    auditError(
      ErrorCode.INVALID_RANGE,
      HttpStatus.BAD_REQUEST,
      'from must be before to',
      'audit.errors.invalidRange',
    ),
  moneyOrStockRequired: () =>
    auditError(
      ErrorCode.MONEY_OR_STOCK_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'This action requires money_or_stock=true',
      'audit.errors.moneyOrStockRequired',
    ),
  notFound: () =>
    auditError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Audit event not found',
      'audit.errors.notFound',
    ),
  unauthorized: () =>
    auditError(
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      'Unauthorized',
      'audit.errors.unauthorized',
    ),
  pharmacySessionRequired: () =>
    auditError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'audit.errors.pharmacySessionRequired',
    ),
  hqOrPharmacyRequired: () =>
    auditError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'A pharmacy or HQ principal is required',
      'audit.errors.forbidden',
    ),
  serviceOnly: () =>
    auditError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'Ingest is service-to-service only',
      'audit.errors.serviceOnly',
    ),
};
