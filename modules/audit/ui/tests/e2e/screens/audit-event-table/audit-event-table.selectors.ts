export const auditEventTableSelectors = {
  time: { role: 'columnheader' as const, name: 'Time' },
  actor: { role: 'columnheader' as const, name: 'Actor' },
  action: { role: 'columnheader' as const, name: 'Action' },
  billAction: { role: 'cell' as const, name: 'bill_posted' },
  empty: { text: 'No audit events yet.' },
  error: { role: 'alert' as const },
} as const;
