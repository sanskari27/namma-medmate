export const listStories = [
  'free-with-seat',
  'at-cap',
  'cashier-drawer',
  'owner-drawer',
  'empty',
  'load-error',
] as const;
export type ListStory = (typeof listStories)[number];

export const drawerStories = ['cashier-drawer', 'owner-drawer'] as const;
export type DrawerStory = (typeof drawerStories)[number];
