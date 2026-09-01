export interface AuthUiError {
  status: number;
  code?: string;
  message?: string;
  lockedUntil?: string;
  resendAvailableAt?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

export function readAuthError(status: number, data: unknown): AuthUiError {
  const root = asRecord(data);
  const inner = asRecord(root?.error) ?? root;
  const details = asRecord(inner?.details);
  return {
    status,
    code: typeof inner?.code === 'string' ? inner.code : undefined,
    message: typeof inner?.message === 'string' ? inner.message : undefined,
    lockedUntil: typeof details?.locked_until === 'string' ? details.locked_until : undefined,
    resendAvailableAt:
      typeof details?.resend_available_at === 'string' ? details.resend_available_at : undefined,
  };
}

export function errorCopyKey(code: string | undefined): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'auth.login.invalidCredentials';
    case 'METHOD_DISABLED':
      return 'auth.login.methodDisabled';
    case 'USER_INACTIVE':
      return 'auth.login.inactive';
    case 'NO_LOGIN_METHOD':
      return 'auth.login.noMethod';
    case 'INVALID_OTP':
      return 'auth.otp.invalid';
    case 'OTP_EXPIRED':
      return 'auth.otp.expired';
    case 'OTP_CONSUMED':
      return 'auth.otp.consumed';
    case 'RESEND_COOLDOWN':
      return 'auth.otp.resendCooldown';
    case 'WHATSAPP_OTP_UNDELIVERABLE':
      return 'auth.otp.undeliverable';
    case 'INVALID_PIN_FORMAT':
      return 'auth.pin.invalidFormat';
    case 'PIN_NOT_SET':
      return 'auth.pin.notSet';
    case 'INVALID_DEVICE':
      return 'auth.pin.invalidDevice';
    case 'DEVICE_EXPIRED':
      return 'auth.pin.deviceExpired';
    case 'ACCOUNT_LOCKED':
      return 'auth.lock.message';
    case 'KIOSK_PIN_LOCKED':
      return 'auth.lock.kiosk';
    case 'RATE_LIMITED':
      return 'auth.lock.rateLimited';
    case 'UNAUTHENTICATED':
      return 'auth.session.unauthenticated';
    default:
      return 'auth.session.error';
  }
}
