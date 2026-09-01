import { createE2eTest } from '@namma-medmate/e2e-kit';
import { PaywallPage } from '../screens/paywall/paywall.page.ts';
import { PlanGatePage } from '../screens/plan-gate/plan-gate.page.ts';
import { NavLockIconPage } from '../screens/nav-lock-icon/nav-lock-icon.page.ts';

export const test = createE2eTest({
  paywallPage: PaywallPage,
  planGatePage: PlanGatePage,
  navLockPage: NavLockIconPage,
});

export { expect } from '@namma-medmate/e2e-kit';
