import { ManageUsersErrors } from './errors.ts';

export const PERMISSION_KEYS = [
  'dashboard',
  'pos-billing',
  'orders',
  'prescriptions',
  'khata',
  'inventory',
  'purchases',
  'racks',
  'distributors-reorder',
  'reports',
  'crm',
  'manage-users',
  'account-settings',
  'saas-billing',
  'go-live-kyc',
  'employees',
  'customers',
  'returns',
  'purchase-returns',
  'statutory-registers',
  'sales-ledger',
  'offers',
  'expenses',
  'books-gst',
  'stock-take',
  'ca-sharing',
  'kiosk',
  'whatsapp',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type StaffRole = 'owner' | 'manager' | 'pharmacist' | 'cashier';

const MANAGER_TRUE = new Set<PermissionKey>([
  'dashboard',
  'pos-billing',
  'orders',
  'prescriptions',
  'khata',
  'inventory',
  'purchases',
  'racks',
  'distributors-reorder',
  'reports',
  'crm',
  'customers',
  'returns',
  'purchase-returns',
  'statutory-registers',
]);

const PHARMACIST_TRUE = new Set<PermissionKey>([
  'pos-billing',
  'orders',
  'prescriptions',
  'inventory',
  'racks',
  'crm',
  'customers',
  'returns',
  'statutory-registers',
]);

const CASHIER_TRUE = new Set<PermissionKey>([
  'pos-billing',
  'orders',
  'khata',
  'customers',
  'returns',
]);

function mapFor(trueKeys: ReadonlySet<PermissionKey>): Record<PermissionKey, boolean> {
  const modules = {} as Record<PermissionKey, boolean>;
  for (const key of PERMISSION_KEYS) {
    modules[key] = trueKeys.has(key);
  }
  return modules;
}

export function allPermissionsTrue(): Record<PermissionKey, boolean> {
  const modules = {} as Record<PermissionKey, boolean>;
  for (const key of PERMISSION_KEYS) {
    modules[key] = true;
  }
  return modules;
}

export function roleDefaultPermissions(role: StaffRole): Record<PermissionKey, boolean> {
  if (role === 'owner') {
    return allPermissionsTrue();
  }
  if (role === 'manager') {
    return mapFor(MANAGER_TRUE);
  }
  if (role === 'pharmacist') {
    return mapFor(PHARMACIST_TRUE);
  }
  return mapFor(CASHIER_TRUE);
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isStaffRole(value: string): value is StaffRole {
  return value === 'owner' || value === 'manager' || value === 'pharmacist' || value === 'cashier';
}

export function mergePermissions(
  current: Record<string, boolean>,
  patch: Record<string, boolean>,
): Record<PermissionKey, boolean> {
  const next = roleDefaultPermissions('cashier');
  for (const key of PERMISSION_KEYS) {
    if (key in current) {
      next[key] = current[key] === true;
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (!isPermissionKey(key)) {
      throw ManageUsersErrors.unknownModuleKey();
    }
    next[key] = value;
  }
  return next;
}

export function replacePermissions(
  incoming: Record<string, boolean>,
): Record<PermissionKey, boolean> {
  const next = allPermissionsTrue();
  for (const key of PERMISSION_KEYS) {
    if (!(key in incoming)) {
      throw ManageUsersErrors.validationError('Replace requires the full permission map');
    }
    next[key] = incoming[key] === true;
  }
  for (const key of Object.keys(incoming)) {
    if (!isPermissionKey(key)) {
      throw ManageUsersErrors.unknownModuleKey();
    }
  }
  return next;
}

export function ownerMapIsAllTrue(permissions: Record<string, boolean>): boolean {
  return PERMISSION_KEYS.every((key) => permissions[key] === true);
}

export function canManageUsers(role: string, permissions: Record<string, boolean>): boolean {
  return role === 'owner' || permissions['manage-users'] === true;
}
