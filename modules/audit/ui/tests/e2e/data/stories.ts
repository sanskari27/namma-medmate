export const tableStories = ['loaded', 'empty', 'load-error'] as const;
export type TableStory = (typeof tableStories)[number];

export const hqTableStories = ['loaded'] as const;
export type HqTableStory = (typeof hqTableStories)[number];
