export const pageStories = ['free-with-seat', 'at-cap', 'empty', 'load-error'] as const;
export type PageStory = (typeof pageStories)[number];

export const drawerStories = ['cashier-drawer', 'owner-drawer'] as const;
export type DrawerStory = (typeof drawerStories)[number];

export const listStories = [...pageStories, ...drawerStories] as const;
export type ListStory = (typeof listStories)[number];
