import {
  expectBannerForbidden,
  openBannerStory,
} from '../../screens/mandatory-banner/mandatory-banner.steps.ts';
import { expectEmptyInbox } from '../../screens/inbox/inbox.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Cashier acknowledge leaves the banner visible', async ({ bannerPage }) => {
  await openBannerStory({ bannerPage }, 'cashier-forbidden');
  await bannerPage.acknowledge();
  await expectBannerForbidden({ bannerPage });
});

test('empty inbox stays empty', async ({ inboxPage }) => {
  await inboxPage.gotoStory('empty');
  await expectEmptyInbox({ inboxPage });
});
