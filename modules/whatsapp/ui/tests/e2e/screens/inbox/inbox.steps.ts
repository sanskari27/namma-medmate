import type { InboxPage } from './inbox.page.ts';
import type { InboxStory } from '../../data/stories.ts';

export async function openInboxStory(
  { inboxPage }: { inboxPage: InboxPage },
  story: InboxStory,
): Promise<void> {
  await inboxPage.gotoStory(story);
}

export async function expectLoadedInbox({ inboxPage }: { inboxPage: InboxPage }): Promise<void> {
  await inboxPage.expectReady();
}

export async function expectEmptyInbox({ inboxPage }: { inboxPage: InboxPage }): Promise<void> {
  await inboxPage.expectEmpty();
}
