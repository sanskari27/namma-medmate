import { expectShareReady } from '../screens/share-button/share-button.steps.ts';
import type { ShareButtonPage } from '../screens/share-button/share-button.page.ts';

export async function reachShareReady({
  sharePage,
}: {
  sharePage: ShareButtonPage;
}): Promise<void> {
  await sharePage.gotoStory('ready');
  await expectShareReady({ sharePage });
}
