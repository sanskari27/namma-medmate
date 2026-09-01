import { expectOrdersWithoutPaywall, openPlanGateStory } from '../screens/paywall/paywall.steps.ts';
import { expectOrdersReady, openPlanGate } from '../screens/plan-gate/plan-gate.steps.ts';
import type { PaywallPage } from '../screens/paywall/paywall.page.ts';
import type { PlanGatePage } from '../screens/plan-gate/plan-gate.page.ts';

export async function reachUnlockedOrders({
  paywallPage,
  planGatePage,
}: {
  paywallPage: PaywallPage;
  planGatePage: PlanGatePage;
}): Promise<void> {
  await openPlanGate({ planGatePage }, 'orders-unlocked');
  await expectOrdersReady({ planGatePage });
  await openPlanGateStory({ paywallPage }, 'orders-unlocked');
  await expectOrdersWithoutPaywall({ paywallPage });
}
