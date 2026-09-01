import {
  expectInventoryWithoutPaywall,
  expectReportsGrowthPaywall,
  openPlanGateStory,
} from '../../screens/paywall/paywall.steps.ts';
import { expectUnlockedNavIcon } from '../../screens/nav-lock-icon/nav-lock-icon.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('expired Growth keeps inventory usable', async ({ paywallPage }) => {
  await openPlanGateStory({ paywallPage }, 'inventory-unlocked');
  await expectInventoryWithoutPaywall({ paywallPage });
});

test('expired Growth reports paywall names Growth at 1499', async ({ paywallPage }) => {
  await openPlanGateStory({ paywallPage }, 'reports-locked');
  await expectReportsGrowthPaywall({ paywallPage });
});

test('unlocked nav item has no lock icon', async ({ navLockPage }) => {
  await expectUnlockedNavIcon({ navLockPage });
});
