export const loginPageSelectors = {
  heading: { role: 'heading' as const, name: 'Sign in' },
  password: { role: 'button' as const, name: 'Password' },
  otp: { role: 'button' as const, name: 'WhatsApp OTP' },
  alert: { role: 'alert' as const },
} as const;
