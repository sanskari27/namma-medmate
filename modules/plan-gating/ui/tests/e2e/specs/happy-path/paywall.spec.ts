import {
  expectKioskProPaywall,
  openPaywallStory,
  openPlanGateStory,
} from '../../screens/paywall/paywall.steps.ts';
import {
  expectLockedNavIcon,
  openLockedNavIcon,
} from '../../screens/nav-lock-icon/nav-lock-icon.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('orders has no paywall on Free', async ({ paywallPage }) => {
  await openPlanGateStory({ paywallPage }, 'orders-unlocked');
  await paywallPage.expectNoPaywall('Orders board');
});

test('kiosk paywall names Pro and monthly 2999', async ({ paywallPage }) => {
  await openPlanGateStory({ paywallPage }, 'kiosk-locked');
  await expectKioskProPaywall({ paywallPage });
});

test('paywall story for Pro kiosk', async ({ paywallPage }) => {
  await openPaywallStory({ paywallPage }, 'kiosk-pro');
  await expectKioskProPaywall({ paywallPage });
});

test('nav lock icon is visible when locked', async ({ navLockPage }) => {
  await openLockedNavIcon({ navLockPage });
  await expectLockedNavIcon({ navLockPage });
});
