export const authWidgetStories = [
  'loading',
  'authenticated',
  'unauthenticated',
  'failure',
] as const;

export type AuthWidgetStory = (typeof authWidgetStories)[number];
