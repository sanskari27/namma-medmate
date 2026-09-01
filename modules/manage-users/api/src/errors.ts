import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

export function manageUsersError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(message, code, status, details, i18nKey);
}

export const ManageUsersErrors = {
  locationRequired: () =>
    manageUsersError(
      ErrorCode.LOCATION_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'manageUsers.errors.locationRequired',
    ),
  pharmacySessionRequired: () =>
    manageUsersError(
      ErrorCode.PHARMACY_SESSION_REQUIRED,
      HttpStatus.FORBIDDEN,
      'A pharmacy session is required',
      'manageUsers.errors.pharmacySessionRequired',
    ),
  forbidden: () =>
    manageUsersError(
      ErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'Forbidden',
      'manageUsers.errors.forbidden',
    ),
  notFound: () =>
    manageUsersError(
      ErrorCode.NOT_FOUND,
      HttpStatus.NOT_FOUND,
      'User not found',
      'manageUsers.errors.notFound',
    ),
  validationError: (message = 'Validation failed') =>
    manageUsersError(
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      message,
      'manageUsers.errors.validationError',
    ),
  seatCapReached: (seatLimit: number, activeCount: number, requiredPlan: 'growth' | 'pro') =>
    manageUsersError(
      ErrorCode.SEAT_CAP_REACHED,
      HttpStatus.CONFLICT,
      'Seat cap reached',
      'manageUsers.errors.seatCapReached',
      { seat_limit: seatLimit, active_count: activeCount, required_plan: requiredPlan },
    ),
  loginIdTaken: () =>
    manageUsersError(
      ErrorCode.LOGIN_ID_TAKEN,
      HttpStatus.CONFLICT,
      'Login ID is already in use',
      'manageUsers.errors.loginIdTaken',
    ),
  authMethodRequired: () =>
    manageUsersError(
      ErrorCode.AUTH_METHOD_REQUIRED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'At least one of password or OTP must be enabled',
      'manageUsers.errors.authMethodRequired',
    ),
  otpMobileRequired: () =>
    manageUsersError(
      ErrorCode.OTP_MOBILE_REQUIRED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'A valid WhatsApp mobile is required for OTP',
      'manageUsers.errors.otpMobileRequired',
    ),
  ownerAccessImmutable: () =>
    manageUsersError(
      ErrorCode.OWNER_ACCESS_IMMUTABLE,
      HttpStatus.CONFLICT,
      'Owner access cannot be reduced',
      'manageUsers.errors.ownerAccessImmutable',
    ),
  ownerAlreadyExists: () =>
    manageUsersError(
      ErrorCode.OWNER_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
      'This pharmacy already has an Owner',
      'manageUsers.errors.ownerAlreadyExists',
    ),
  ownerRequired: () =>
    manageUsersError(
      ErrorCode.OWNER_REQUIRED,
      HttpStatus.CONFLICT,
      'The Owner login cannot be removed',
      'manageUsers.errors.ownerRequired',
    ),
  tempPasswordUnavailable: () =>
    manageUsersError(
      ErrorCode.TEMP_PASSWORD_UNAVAILABLE,
      HttpStatus.CONFLICT,
      'Temporary password is no longer available',
      'manageUsers.errors.tempPasswordUnavailable',
    ),
  employeeAlreadyLinked: () =>
    manageUsersError(
      ErrorCode.EMPLOYEE_ALREADY_LINKED,
      HttpStatus.CONFLICT,
      'This employee is already linked to a user',
      'manageUsers.errors.employeeAlreadyLinked',
    ),
  unknownModuleKey: () =>
    manageUsersError(
      ErrorCode.UNKNOWN_MODULE_KEY,
      HttpStatus.BAD_REQUEST,
      'Unknown module key',
      'manageUsers.errors.unknownModuleKey',
    ),
  idempotencyConflict: () =>
    manageUsersError(
      ErrorCode.IDEMPOTENCY_CONFLICT,
      HttpStatus.CONFLICT,
      'Idempotency key was reused with a different body',
      'manageUsers.errors.idempotencyConflict',
    ),
};
