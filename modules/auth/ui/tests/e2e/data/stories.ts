export const authWidgetStories = [
  'loading',
  'authenticated',
  'unauthenticated',
  'failure',
] as const;

export type AuthWidgetStory = (typeof authWidgetStories)[number];

export const loginPageStories = ['both-methods', 'otp-only', 'lockout', 'undeliverable'] as const;
export type LoginPageStory = (typeof loginPageStories)[number];

export const pinUnlockStories = ['pin-unlock'] as const;
export type PinUnlockStory = (typeof pinUnlockStories)[number];
