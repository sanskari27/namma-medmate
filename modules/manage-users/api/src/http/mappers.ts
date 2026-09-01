import type { SavedDeviceRecord, UserRecord } from '@namma-medmate/db-services';
import { PERMISSION_KEYS, roleDefaultPermissions, type PermissionKey } from '../permissions.ts';

export function fullPermissions(user: UserRecord): Record<PermissionKey, boolean> {
  const defaults = roleDefaultPermissions(user.role);
  for (const key of PERMISSION_KEYS) {
    if (key in user.permissions) {
      defaults[key] = user.permissions[key] === true;
    }
  }
  if (user.role === 'owner') {
    for (const key of PERMISSION_KEYS) {
      defaults[key] = true;
    }
  }
  return defaults;
}

export function toUserListItem(
  user: UserRecord,
  savedDeviceCount: number,
  includeFullPermissions = false,
) {
  const item: Record<string, unknown> = {
    user_id: user.userId,
    login_id: user.loginId,
    role: user.role,
    active: user.active,
    employee_id: user.employeeId,
    otp_mobile: user.otpMobile,
    password_enabled: user.passwordEnabled,
    otp_enabled: user.otpEnabled,
    pin_set: Boolean(user.pinHash),
    temp_password_pending: user.tempPasswordPending,
    saved_device_count: savedDeviceCount,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
  if (includeFullPermissions) {
    item.permissions = fullPermissions(user);
  }
  return item;
}

export function toSavedDevice(item: SavedDeviceRecord) {
  return {
    device_id: item.deviceId,
    label: item.userAgent ?? 'Saved device',
    last_seen_at: item.lastUsedAt.toISOString(),
    created_at: item.createdAt.toISOString(),
  };
}

export function requiredPlanForLimit(seatLimit: number): 'growth' | 'pro' {
  return seatLimit === 5 ? 'pro' : 'growth';
}
