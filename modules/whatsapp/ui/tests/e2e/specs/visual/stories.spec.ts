import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { bannerStories, inboxStories, shareStories } from '../../data/stories.ts';
import { openInboxStory } from '../../screens/inbox/inbox.steps.ts';
import { openBannerStory } from '../../screens/mandatory-banner/mandatory-banner.steps.ts';
import { openShareStory } from '../../screens/share-button/share-button.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of inboxStories) {
  test(taggedTitle(`visual for inbox ${story}`, e2eTags.visual), async ({ inboxPage, visual }) => {
    await openInboxStory({ inboxPage }, story);
    if (story === 'loaded') {
      await inboxPage.expectReady();
    } else {
      await inboxPage.expectEmpty();
    }
    await visual.screenshot(`inbox-${story}.png`);
  });
}

for (const story of bannerStories) {
  test(
    taggedTitle(`visual for banner ${story}`, e2eTags.visual),
    async ({ bannerPage, visual }) => {
      await openBannerStory({ bannerPage }, story);
      await bannerPage.expectReady();
      await visual.screenshot(`banner-${story}.png`);
    },
  );
}

for (const story of shareStories) {
  test(taggedTitle(`visual for share ${story}`, e2eTags.visual), async ({ sharePage, visual }) => {
    await openShareStory({ sharePage }, story);
    await sharePage.expectReady();
    await visual.screenshot(`share-${story}.png`);
  });
}
