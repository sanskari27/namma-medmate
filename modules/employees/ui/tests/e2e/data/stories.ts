export const pageStories = ['directory', 'empty', 'load-error'] as const;
export type PageStory = (typeof pageStories)[number];

export const lockStories = ['plan-locked'] as const;
export type LockStory = (typeof lockStories)[number];

export const drawerStories = ['employee-drawer'] as const;
export type DrawerStory = (typeof drawerStories)[number];
