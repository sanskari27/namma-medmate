import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function whatsappError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
): AppError {
  return new AppError(message, code, status, undefined, i18nKey);
}

export const WhatsAppErrors = {
  validationFailed: (message = 'Validation failed') =>
    whatsappError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'whatsapp.errors.validationFailed',
    ),
  locationIdRequired: () =>
    whatsappError(
      ErrorCode.LOCATION_ID_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'whatsapp.errors.locationIdRequired',
    ),
  invalidTo: () =>
    whatsappError(
      ErrorCode.INVALID_WHATSAPP_TO,
      HttpStatus.BAD_REQUEST,
      'to must be an E.164 mobile number',
      'whatsapp.errors.invalidTo',
    ),
  unknownTemplate: () =>
    whatsappError(
      ErrorCode.UNKNOWN_TEMPLATE,
      HttpStatus.BAD_REQUEST,
      'Unknown template_key',
      'whatsapp.errors.unknownTemplate',
    ),
  idempotencyKeyRequired: () =>
    whatsappError(
      ErrorCode.IDEMPOTENCY_KEY_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'idempotency_key is required when bill_id is absent',
      'whatsapp.errors.idempotencyKeyRequired',
    ),
  textTooLong: () =>
    whatsappError(
      ErrorCode.TEXT_TOO_LONG,
      HttpStatus.BAD_REQUEST,
      'Share text is too long',
      'whatsapp.errors.textTooLong',
    ),
  locationTenantMismatch: () =>
    whatsappError(
      ErrorCode.LOCATION_TENANT_MISMATCH,
      HttpStatus.FORBIDDEN,
      'Location does not belong to this pharmacy',
      'whatsapp.errors.locationTenantMismatch',
    ),
  locationNotFound: () =>
    whatsappError(
      ErrorCode.LOCATION_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Location not found',
      'whatsapp.errors.locationNotFound',
    ),
  forbiddenRole: () =>
    whatsappError(
      ErrorCode.FORBIDDEN_ROLE,
      HttpStatus.FORBIDDEN,
      'Only the Owner can acknowledge a mandatory WhatsApp failure',
      'whatsapp.errors.forbiddenRole',
    ),
  notMandatoryFailure: () =>
    whatsappError(
      ErrorCode.NOT_MANDATORY_FAILURE,
      HttpStatus.CONFLICT,
      'Message is not an unacknowledged mandatory failure',
      'whatsapp.errors.notMandatoryFailure',
    ),
  hqOnly: () =>
    whatsappError(
      ErrorCode.HQ_ONLY,
      HttpStatus.FORBIDDEN,
      'This endpoint is for Platform Admin HQ principals',
      'whatsapp.errors.hqOnly',
    ),
  pharmacySessionRequired: () =>
    whatsappError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'whatsapp.errors.pharmacySessionRequired',
    ),
  unauthorized: () =>
    whatsappError(
      ErrorCode.UNAUTHORIZED,
      HttpStatus.UNAUTHORIZED,
      'Unauthorized',
      'whatsapp.errors.unauthorized',
    ),
};
