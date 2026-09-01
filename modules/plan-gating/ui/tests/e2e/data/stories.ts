export const planGateStories = [
  'orders-unlocked',
  'kiosk-locked',
  'inventory-unlocked',
  'reports-locked',
] as const;
export type PlanGateStory = (typeof planGateStories)[number];

export const paywallStories = ['kiosk-pro', 'reports-growth'] as const;
export type PaywallStory = (typeof paywallStories)[number];
