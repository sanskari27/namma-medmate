export const wizardSelectors = {
  title: { role: 'heading' as const, name: 'Go-live wizard' },
  continueProfile: { role: 'button' as const, name: 'Pharmacy profile' },
  zeroStock: { role: 'button' as const, name: 'Start with zero stock' },
  submitKyc: { role: 'button' as const, name: 'Submit KYC' },
  complete: { role: 'button' as const, name: 'Complete setup' },
  rerun: { role: 'button' as const, name: 'Run setup wizard' },
  rejected: { text: 'HQ rejected KYC' },
  error: { role: 'alert' as const },
} as const;
