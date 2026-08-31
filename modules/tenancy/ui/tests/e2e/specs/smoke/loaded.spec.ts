import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachLoadedShop } from '../../flows/reach-loaded-shop.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(
  taggedTitle('shop identity badge is reachable', e2eTags.smoke),
  async ({ shopIdentityPage }) => {
    await reachLoadedShop({ shopIdentityPage });
  },
);
