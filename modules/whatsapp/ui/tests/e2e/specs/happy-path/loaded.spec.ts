import { reachLoadedInbox } from '../../flows/reach-loaded-inbox.flow.ts';
import { reachMandatoryBanner } from '../../flows/reach-mandatory-banner.flow.ts';
import { reachShareReady } from '../../flows/reach-share-ready.flow.ts';
import {
  acknowledgeMandatoryBanner,
  expectBannerHidden,
} from '../../screens/mandatory-banner/mandatory-banner.steps.ts';
import { expectShareOpened, shareBill } from '../../screens/share-button/share-button.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('loaded inbox shows Read status without OTP digits', async ({ inboxPage }) => {
  await reachLoadedInbox({ inboxPage });
});

test('Owner acknowledge hides the mandatory banner', async ({ bannerPage }) => {
  await reachMandatoryBanner({ bannerPage });
  await acknowledgeMandatoryBanner({ bannerPage });
  await expectBannerHidden({ bannerPage });
});

test('Share bill opens a WhatsApp deeplink helper', async ({ sharePage }) => {
  await reachShareReady({ sharePage });
  await shareBill({ sharePage });
  await expectShareOpened({ sharePage });
});
