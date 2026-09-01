export const listStories = ['loaded', 'empty', 'load-error'] as const;
export type ListStory = (typeof listStories)[number];

export const drawerStories = ['loaded', 'empty-stocking'] as const;
export type DrawerStory = (typeof drawerStories)[number];

export const addModalStories = ['open'] as const;
export type AddModalStory = (typeof addModalStories)[number];
