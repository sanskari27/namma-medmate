import { expectLoadedInbox } from '../screens/inbox/inbox.steps.ts';
import type { InboxPage } from '../screens/inbox/inbox.page.ts';

export async function reachLoadedInbox({ inboxPage }: { inboxPage: InboxPage }): Promise<void> {
  await inboxPage.gotoStory('loaded');
  await expectLoadedInbox({ inboxPage });
}
