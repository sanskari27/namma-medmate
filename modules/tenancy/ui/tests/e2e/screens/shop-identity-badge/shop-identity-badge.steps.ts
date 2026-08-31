import type { ShopIdentityBadgePage } from './shop-identity-badge.page.ts';
import type { ShopIdentityStory } from '../../data/stories.ts';

export async function openShopIdentityStory(
  { shopIdentityPage }: { shopIdentityPage: ShopIdentityBadgePage },
  story: ShopIdentityStory,
): Promise<void> {
  await shopIdentityPage.gotoStory(story);
}

export async function expectLoadedShopBadge({
  shopIdentityPage,
}: {
  shopIdentityPage: ShopIdentityBadgePage;
}): Promise<void> {
  await shopIdentityPage.expectReady();
  await shopIdentityPage.expectNoLocationSwitcher();
}

export async function expectShopIdentityFailure({
  shopIdentityPage,
}: {
  shopIdentityPage: ShopIdentityBadgePage;
}): Promise<void> {
  await shopIdentityPage.expectAlertVisible();
}
