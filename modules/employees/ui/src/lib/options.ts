export const EMPLOYEE_POSITIONS = [
  'owner',
  'manager',
  'pharmacist',
  'cashier',
  'helper',
  'other',
] as const;

export const EMPLOYEE_STATUSES = ['active', 'inactive', 'separated'] as const;

export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
