import { reachShopIdentityFailure } from '../../flows/reach-shop-identity-failure.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('error story exposes a location required alert', async ({ shopIdentityPage }) => {
  await reachShopIdentityFailure({ shopIdentityPage });
});
