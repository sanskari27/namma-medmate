import { AppError } from '@namma-medmate/error-handling';
import {
  ErrorCode,
  HttpStatus,
  type ErrorCodeValue,
  type HttpStatusCode,
} from '@namma-medmate/constants';

function authError(
  code: ErrorCodeValue,
  status: HttpStatusCode,
  message: string,
  i18nKey: string,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(message, code, status, details, i18nKey);
}

export const AuthErrors = {
  invalidCredentials: () =>
    authError(
      ErrorCode.INVALID_CREDENTIALS,
      HttpStatus.UNAUTHORIZED,
      'Invalid credentials',
      'auth.login.invalidCredentials',
    ),
  invalidOtp: () =>
    authError(ErrorCode.INVALID_OTP, HttpStatus.UNAUTHORIZED, 'Invalid OTP', 'auth.otp.invalid'),
  otpExpired: () =>
    authError(ErrorCode.OTP_EXPIRED, HttpStatus.UNAUTHORIZED, 'OTP expired', 'auth.otp.expired'),
  otpConsumed: () =>
    authError(
      ErrorCode.OTP_CONSUMED,
      HttpStatus.UNAUTHORIZED,
      'OTP already used',
      'auth.otp.consumed',
    ),
  unauthenticated: () =>
    authError(
      ErrorCode.UNAUTHENTICATED,
      HttpStatus.UNAUTHORIZED,
      'Session is not valid',
      'auth.session.unauthenticated',
    ),
  invalidDevice: () =>
    authError(
      ErrorCode.INVALID_DEVICE,
      HttpStatus.UNAUTHORIZED,
      'Saved device is not valid',
      'auth.pin.invalidDevice',
    ),
  deviceExpired: () =>
    authError(
      ErrorCode.DEVICE_EXPIRED,
      HttpStatus.UNAUTHORIZED,
      'Saved device expired',
      'auth.pin.deviceExpired',
    ),
  methodDisabled: () =>
    authError(
      ErrorCode.METHOD_DISABLED,
      HttpStatus.FORBIDDEN,
      'This login method is disabled',
      'auth.login.methodDisabled',
    ),
  userInactive: () =>
    authError(
      ErrorCode.USER_INACTIVE,
      HttpStatus.FORBIDDEN,
      'User is inactive',
      'auth.login.inactive',
    ),
  noLoginMethod: () =>
    authError(
      ErrorCode.NO_LOGIN_METHOD,
      HttpStatus.BAD_REQUEST,
      'No login method is enabled',
      'auth.login.noMethod',
    ),
  invalidPinFormat: () =>
    authError(
      ErrorCode.INVALID_PIN_FORMAT,
      HttpStatus.BAD_REQUEST,
      'PIN must be 4 to 6 digits',
      'auth.pin.invalidFormat',
    ),
  pinNotSet: () =>
    authError(
      ErrorCode.PIN_NOT_SET,
      HttpStatus.PRECONDITION_FAILED,
      'PIN is not set',
      'auth.pin.notSet',
    ),
  accountLocked: (lockedUntil: string) =>
    authError(
      ErrorCode.ACCOUNT_LOCKED,
      HttpStatus.LOCKED,
      'Account is locked',
      'auth.lock.message',
      { locked_until: lockedUntil },
    ),
  kioskPinLocked: (lockedUntil: string) =>
    authError(
      ErrorCode.KIOSK_PIN_LOCKED,
      HttpStatus.LOCKED,
      'Kiosk PIN is locked',
      'auth.lock.kiosk',
      { locked_until: lockedUntil },
    ),
  resendCooldown: (resendAvailableAt: string) =>
    authError(
      ErrorCode.RESEND_COOLDOWN,
      HttpStatus.TOO_MANY_REQUESTS,
      'OTP resend is not available yet',
      'auth.otp.resendCooldown',
      { resend_available_at: resendAvailableAt },
    ),
  undeliverable: () =>
    authError(
      ErrorCode.WHATSAPP_OTP_UNDELIVERABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      'Use your password if enabled, or ask the Owner to reset.',
      'auth.otp.undeliverable',
    ),
  locationIdRequired: () =>
    authError(
      ErrorCode.LOCATION_ID_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'location_id is required',
      'auth.errors.locationIdRequired',
    ),
  locationMismatch: () =>
    authError(
      ErrorCode.LOCATION_TENANT_MISMATCH,
      HttpStatus.FORBIDDEN,
      'Location does not match the session',
      'auth.errors.locationMismatch',
    ),
  rateLimited: () =>
    authError(
      ErrorCode.RATE_LIMITED,
      HttpStatus.TOO_MANY_REQUESTS,
      'Too many login attempts',
      'auth.lock.rateLimited',
    ),
  validationFailed: (message = 'Validation failed') =>
    authError(
      ErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
      'auth.errors.validationFailed',
    ),
  forbiddenRole: () =>
    authError(
      ErrorCode.FORBIDDEN_ROLE,
      HttpStatus.FORBIDDEN,
      'Only the Owner can manage another user',
      'auth.errors.forbiddenRole',
    ),
};
