import type { MandatoryBannerPage } from './mandatory-banner.page.ts';
import type { BannerStory } from '../../data/stories.ts';

export async function openBannerStory(
  { bannerPage }: { bannerPage: MandatoryBannerPage },
  story: BannerStory,
): Promise<void> {
  await bannerPage.gotoStory(story);
}

export async function expectMandatoryBanner({
  bannerPage,
}: {
  bannerPage: MandatoryBannerPage;
}): Promise<void> {
  await bannerPage.expectReady();
}

export async function acknowledgeMandatoryBanner({
  bannerPage,
}: {
  bannerPage: MandatoryBannerPage;
}): Promise<void> {
  await bannerPage.acknowledge();
}

export async function expectBannerHidden({
  bannerPage,
}: {
  bannerPage: MandatoryBannerPage;
}): Promise<void> {
  await bannerPage.expectHidden();
}

export async function expectBannerForbidden({
  bannerPage,
}: {
  bannerPage: MandatoryBannerPage;
}): Promise<void> {
  await bannerPage.expectForbidden();
}
