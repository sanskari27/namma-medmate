export const mandatoryBannerSelectors = {
  alert: { role: 'alert' as const },
  bill: { text: 'INV-24-00019' },
  acknowledge: { role: 'button' as const, name: 'Acknowledge' },
  forbidden: { text: 'Only the Owner can acknowledge this alert' },
} as const;
