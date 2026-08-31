import { expectShopIdentityFailure } from '../screens/shop-identity-badge/shop-identity-badge.steps.ts';
import type { ShopIdentityBadgePage } from '../screens/shop-identity-badge/shop-identity-badge.page.ts';

export async function reachShopIdentityFailure({
  shopIdentityPage,
}: {
  shopIdentityPage: ShopIdentityBadgePage;
}): Promise<void> {
  await shopIdentityPage.gotoStory('error');
  await expectShopIdentityFailure({ shopIdentityPage });
}
