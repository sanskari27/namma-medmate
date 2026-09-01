export const employeesListSelectors = {
  title: { role: 'heading' as const, name: 'Employees' },
  add: { role: 'button' as const, name: 'Add employee' },
  exportCsv: { role: 'button' as const, name: 'Export CSV' },
  pharmacist: { role: 'button' as const, name: 'Open Anita Sharma' },
  cashier: { role: 'button' as const, name: 'Open Ravi Kumar' },
  empty: { text: 'No employees yet.' },
  error: { role: 'alert' as const },
  search: { role: 'textbox' as const, name: 'Search name, phone, or code' },
} as const;

export const employeesLockSelectors = {
  title: { role: 'heading' as const, name: 'Employees is on Starter' },
  body: { text: 'Unlock the HR directory on Starter at ₹699 + 18% GST' },
} as const;
