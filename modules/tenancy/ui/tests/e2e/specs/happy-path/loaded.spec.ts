import { reachLoadedShop } from '../../flows/reach-loaded-shop.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('loaded shop shows one name and no location switcher', async ({ shopIdentityPage }) => {
  await reachLoadedShop({ shopIdentityPage });
});
