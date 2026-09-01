import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachUnlockedOrders } from '../../flows/reach-unlocked-orders.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(
  taggedTitle('plan gate orders story is reachable', e2eTags.smoke),
  async ({ paywallPage, planGatePage }) => {
    await reachUnlockedOrders({ paywallPage, planGatePage });
  },
);
