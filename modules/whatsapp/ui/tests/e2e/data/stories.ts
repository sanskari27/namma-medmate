export const inboxStories = ['loaded', 'empty'] as const;
export type InboxStory = (typeof inboxStories)[number];

export const bannerStories = ['failed', 'cashier-forbidden'] as const;
export type BannerStory = (typeof bannerStories)[number];

export const shareStories = ['ready'] as const;
export type ShareStory = (typeof shareStories)[number];
