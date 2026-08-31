export const inboxSelectors = {
  heading: { role: 'heading' as const, name: 'WhatsApp' },
  filter: { role: 'combobox' as const, name: 'Status filter' },
  readStatus: { role: 'cell' as const, name: 'Read' },
  otpPreview: { text: 'Login code sent.' },
  empty: { text: 'No WhatsApp messages yet.' },
} as const;
