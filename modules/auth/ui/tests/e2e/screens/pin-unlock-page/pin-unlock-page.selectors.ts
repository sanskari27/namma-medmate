export const pinUnlockSelectors = {
  heading: { role: 'heading' as const, name: 'Unlock this device' },
  unlock: { role: 'button' as const, name: 'Unlock' },
  usePassword: { role: 'button' as const, name: 'Use password or OTP instead' },
} as const;
