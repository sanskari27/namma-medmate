export const shopIdentityStories = ['loaded', 'error', 'cashier-forbidden'] as const;
export type ShopIdentityStory = (typeof shopIdentityStories)[number];
