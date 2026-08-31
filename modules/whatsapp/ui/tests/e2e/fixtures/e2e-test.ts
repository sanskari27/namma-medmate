import { createE2eTest } from '@namma-medmate/e2e-kit';
import { InboxPage } from '../screens/inbox/inbox.page.ts';
import { MandatoryBannerPage } from '../screens/mandatory-banner/mandatory-banner.page.ts';
import { ShareButtonPage } from '../screens/share-button/share-button.page.ts';

export const test = createE2eTest({
  inboxPage: InboxPage,
  bannerPage: MandatoryBannerPage,
  sharePage: ShareButtonPage,
});

export { expect } from '@namma-medmate/e2e-kit';
