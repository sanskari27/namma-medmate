import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function goLiveKycError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(message, code, status, details, i18nKey);
}

export const GoLiveKycErrors = {
  locationRequired: () =>
    goLiveKycError(
      ErrorCode.LOCATION_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'goLiveKyc.errors.locationRequired',
    ),
  pharmacySessionRequired: () =>
    goLiveKycError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'goLiveKyc.errors.pharmacySessionRequired',
    ),
  hqOnly: () =>
    goLiveKycError(
      ErrorCode.HQ_ONLY,
      HttpStatus.FORBIDDEN,
      'HQ principal required',
      'goLiveKyc.errors.hqOnly',
    ),
  ownerOnly: () =>
    goLiveKycError(
      ErrorCode.OWNER_ONLY,
      HttpStatus.FORBIDDEN,
      'Only the Owner can complete go-live KYC',
      'goLiveKyc.errors.ownerOnly',
    ),
  forbidden: () =>
    goLiveKycError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'Forbidden',
      'goLiveKyc.errors.forbidden',
    ),
  notFound: () =>
    goLiveKycError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'Pharmacy KYC not found',
      'goLiveKyc.errors.notFound',
    ),
  validationError: (message = 'Validation failed') =>
    goLiveKycError(
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      message,
      'goLiveKyc.errors.validationError',
    ),
  kycFieldsIncomplete: () =>
    goLiveKycError(
      ErrorCode.KYC_FIELDS_INCOMPLETE,
      HttpStatus.BAD_REQUEST,
      'Required KYC fields are missing',
      'goLiveKyc.errors.kycFieldsIncomplete',
    ),
  kycNotPending: () =>
    goLiveKycError(
      ErrorCode.KYC_NOT_PENDING,
      HttpStatus.CONFLICT,
      'KYC is not pending',
      'goLiveKyc.errors.kycNotPending',
    ),
  printSampleRequired: () =>
    goLiveKycError(
      ErrorCode.PRINT_SAMPLE_REQUIRED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Print sample must be confirmed',
      'goLiveKyc.errors.printSampleRequired',
    ),
  openingStockFailed: () =>
    goLiveKycError(
      ErrorCode.OPENING_STOCK_FAILED,
      HttpStatus.CONFLICT,
      'Opening stock ingest failed',
      'goLiveKyc.errors.openingStockFailed',
    ),
  openingBooksFailed: () =>
    goLiveKycError(
      ErrorCode.OPENING_BOOKS_FAILED,
      HttpStatus.CONFLICT,
      'Opening books post failed',
      'goLiveKyc.errors.openingBooksFailed',
    ),
  openingBooksAlreadyPosted: () =>
    goLiveKycError(
      ErrorCode.OPENING_BOOKS_ALREADY_POSTED,
      HttpStatus.CONFLICT,
      'Opening books already posted',
      'goLiveKyc.errors.openingBooksAlreadyPosted',
    ),
  seatCapReached: () =>
    goLiveKycError(
      ErrorCode.SEAT_CAP_REACHED,
      HttpStatus.CONFLICT,
      'Seat cap reached',
      'goLiveKyc.errors.seatCapReached',
    ),
  uploadKeyInvalid: () =>
    goLiveKycError(
      ErrorCode.UPLOAD_KEY_INVALID,
      HttpStatus.BAD_REQUEST,
      'Upload key is not valid for this tenant',
      'goLiveKyc.errors.uploadKeyInvalid',
    ),
  idempotencyConflict: () =>
    goLiveKycError(
      ErrorCode.IDEMPOTENCY_CONFLICT,
      HttpStatus.CONFLICT,
      'Idempotency key was reused with a different body',
      'goLiveKyc.errors.idempotencyConflict',
    ),
};
