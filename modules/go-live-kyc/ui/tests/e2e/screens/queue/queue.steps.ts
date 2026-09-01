import type { HqKycQueueScreen } from './queue.page.ts';
import type { QueueStory } from '../../data/stories.ts';

export async function openQueueStory(
  { queuePage }: { queuePage: HqKycQueueScreen },
  story: QueueStory,
): Promise<void> {
  await queuePage.gotoStory(story);
}

export async function expectApproveEnabled({
  queuePage,
}: {
  queuePage: HqKycQueueScreen;
}): Promise<void> {
  await queuePage.expectApproveEnabled();
}

export async function expectEmptyQueue({
  queuePage,
}: {
  queuePage: HqKycQueueScreen;
}): Promise<void> {
  await queuePage.expectEmpty();
}

export async function expectQueueError({
  queuePage,
}: {
  queuePage: HqKycQueueScreen;
}): Promise<void> {
  await queuePage.expectError();
}
