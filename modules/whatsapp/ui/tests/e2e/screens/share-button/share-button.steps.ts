import type { ShareButtonPage } from './share-button.page.ts';
import type { ShareStory } from '../../data/stories.ts';

export async function openShareStory(
  { sharePage }: { sharePage: ShareButtonPage },
  story: ShareStory,
): Promise<void> {
  await sharePage.gotoStory(story);
}

export async function expectShareReady({
  sharePage,
}: {
  sharePage: ShareButtonPage;
}): Promise<void> {
  await sharePage.expectReady();
}

export async function shareBill({ sharePage }: { sharePage: ShareButtonPage }): Promise<void> {
  await sharePage.share();
}

export async function expectShareOpened({
  sharePage,
}: {
  sharePage: ShareButtonPage;
}): Promise<void> {
  await sharePage.expectOpened();
}
