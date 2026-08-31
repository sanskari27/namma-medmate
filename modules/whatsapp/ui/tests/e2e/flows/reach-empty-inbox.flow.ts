import { expectEmptyInbox } from '../screens/inbox/inbox.steps.ts';
import type { InboxPage } from '../screens/inbox/inbox.page.ts';

export async function reachEmptyInbox({ inboxPage }: { inboxPage: InboxPage }): Promise<void> {
  await inboxPage.gotoStory('empty');
  await expectEmptyInbox({ inboxPage });
}
