export const queueSelectors = {
  title: { role: 'heading' as const, name: 'KYC queue' },
  approve: { role: 'button' as const, name: 'Approve' },
  reject: { role: 'button' as const, name: 'Reject' },
  empty: { text: 'No KYC submissions.' },
  error: { role: 'alert' as const },
} as const;
