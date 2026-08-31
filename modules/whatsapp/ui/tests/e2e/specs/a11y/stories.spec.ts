import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { bannerStories, inboxStories, shareStories } from '../../data/stories.ts';
import { openInboxStory } from '../../screens/inbox/inbox.steps.ts';
import { openBannerStory } from '../../screens/mandatory-banner/mandatory-banner.steps.ts';
import { openShareStory } from '../../screens/share-button/share-button.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of inboxStories) {
  test(taggedTitle(`a11y for inbox ${story}`, e2eTags.a11y), async ({ inboxPage, a11y }) => {
    await openInboxStory({ inboxPage }, story);
    if (story === 'loaded') {
      await inboxPage.expectReady();
    } else {
      await inboxPage.expectEmpty();
    }
    await a11y.scan();
  });
}

for (const story of bannerStories) {
  test(taggedTitle(`a11y for banner ${story}`, e2eTags.a11y), async ({ bannerPage, a11y }) => {
    await openBannerStory({ bannerPage }, story);
    await bannerPage.expectReady();
    await a11y.scan();
  });
}

for (const story of shareStories) {
  test(taggedTitle(`a11y for share ${story}`, e2eTags.a11y), async ({ sharePage, a11y }) => {
    await openShareStory({ sharePage }, story);
    await sharePage.expectReady();
    await a11y.scan();
  });
}
