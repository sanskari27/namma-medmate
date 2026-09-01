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
export const ADDABLE_ROLES: StaffRole[] = ['manager', 'pharmacist', 'cashier'];

export function methodsLabel(passwordEnabled: boolean, otpEnabled: boolean): string {
  const parts: string[] = [];
  if (passwordEnabled) {
    parts.push('Password');
  }
  if (otpEnabled) {
    parts.push('WhatsApp OTP');
  }
  return parts.join(', ');
}
