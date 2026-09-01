export const userDrawerSelectors = {
  title: { role: 'heading' as const, name: 'User' },
  copy: { role: 'button' as const, name: 'Copy password' },
  reset: { role: 'button' as const, name: 'Reset password' },
  share: { role: 'button' as const, name: 'Share via WhatsApp' },
  remove: { role: 'button' as const, name: 'Remove login' },
  selectAll: { role: 'button' as const, name: 'Select all' },
  resetDefaults: { role: 'button' as const, name: 'Reset to role defaults' },
} as const;
