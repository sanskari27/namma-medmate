import { expectLoadedShopBadge } from '../screens/shop-identity-badge/shop-identity-badge.steps.ts';
import type { ShopIdentityBadgePage } from '../screens/shop-identity-badge/shop-identity-badge.page.ts';

export async function reachLoadedShop({
  shopIdentityPage,
}: {
  shopIdentityPage: ShopIdentityBadgePage;
}): Promise<void> {
  await shopIdentityPage.gotoStory('loaded');
  await expectLoadedShopBadge({ shopIdentityPage });
}
