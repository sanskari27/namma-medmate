import { expectMandatoryBanner } from '../screens/mandatory-banner/mandatory-banner.steps.ts';
import type { MandatoryBannerPage } from '../screens/mandatory-banner/mandatory-banner.page.ts';

export async function reachMandatoryBanner({
  bannerPage,
}: {
  bannerPage: MandatoryBannerPage;
}): Promise<void> {
  await bannerPage.gotoStory('failed');
  await expectMandatoryBanner({ bannerPage });
}
