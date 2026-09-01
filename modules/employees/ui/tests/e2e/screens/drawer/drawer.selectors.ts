export const employeesDrawerSelectors = {
  title: { role: 'heading' as const, name: 'Employee' },
  idCard: { role: 'button' as const, name: 'Generate ID card' },
  save: { role: 'button' as const, name: 'Save' },
} as const;
