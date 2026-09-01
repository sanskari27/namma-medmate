export function canManageEmployees(role: string, permissions: Record<string, boolean>): boolean {
  return role === 'owner' || permissions['employees'] === true;
}

export function canReadPharmacistEligible(
  role: string,
  permissions: Record<string, boolean>,
): boolean {
  return (
    role === 'owner' ||
    role === 'manager' ||
    role === 'pharmacist' ||
    permissions['employees'] === true ||
    permissions['statutory-registers'] === true
  );
}

export function allPermissionsTrue(): Record<string, boolean> {
  return { employees: true, 'statutory-registers': true, 'manage-users': true };
}
