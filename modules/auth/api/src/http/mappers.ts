import type { PinPurpose, StaffRole, UserRecord } from '@namma-medmate/db-services';

export const ROLE_LABEL: Record<StaffRole, 'Owner' | 'Manager' | 'Pharmacist' | 'Cashier'> = {
  owner: 'Owner',
  manager: 'Manager',
  pharmacist: 'Pharmacist',
  cashier: 'Cashier',
};

export function toLoginPayload(
  user: UserRecord,
  session: { sessionId: string; sessionToken: string; deviceToken: string | null },
) {
  return {
    session_token: session.sessionToken,
    session_id: session.sessionId,
    user_id: user.userId,
    tenant_id: user.tenantId,
    location_id: user.locationId,
    role: ROLE_LABEL[user.role],
    password_enabled: user.passwordEnabled,
    otp_enabled: user.otpEnabled,
    device_token: session.deviceToken,
  };
}

export function toSessionPayload(
  user: UserRecord,
  sessionId: string,
): {
  session_id: string;
  user_id: string;
  login_id: string;
  role: (typeof ROLE_LABEL)[StaffRole];
  tenant_id: string;
  location_id: string;
  password_enabled: boolean;
  otp_enabled: boolean;
  has_pin: boolean;
  permissions_owner_frozen: boolean;
} {
  return {
    session_id: sessionId,
    user_id: user.userId,
    login_id: user.loginId,
    role: ROLE_LABEL[user.role],
    tenant_id: user.tenantId,
    location_id: user.locationId,
    password_enabled: user.passwordEnabled,
    otp_enabled: user.otpEnabled,
    has_pin: Boolean(user.pinHash),
    permissions_owner_frozen: user.role === 'owner',
  };
}

export function isPinPurpose(value: unknown): value is PinPurpose {
  return (
    value === 'kiosk_exit' ||
    value === 'fefo_override' ||
    value === 'below_cost' ||
    value === 'credit_limit' ||
    value === 'saved_device_unlock'
  );
}
