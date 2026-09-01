export const wizardStories = ['start', 'rejected', 'complete', 'load-error'] as const;
export type WizardStory = (typeof wizardStories)[number];

export const queueStories = ['pending', 'empty', 'load-error'] as const;
export type QueueStory = (typeof queueStories)[number];
