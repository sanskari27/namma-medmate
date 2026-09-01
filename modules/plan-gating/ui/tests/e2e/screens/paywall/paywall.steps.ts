import type { PaywallPage } from './paywall.page.ts';
import type { PaywallStory, PlanGateStory } from '../../data/stories.ts';

export async function openPaywallStory(
  { paywallPage }: { paywallPage: PaywallPage },
  story: PaywallStory,
): Promise<void> {
  await paywallPage.gotoPaywallStory(story);
}

export async function openPlanGateStory(
  { paywallPage }: { paywallPage: PaywallPage },
  story: PlanGateStory,
): Promise<void> {
  await paywallPage.gotoPlanGateStory(story);
}

export async function expectKioskProPaywall({
  paywallPage,
}: {
  paywallPage: PaywallPage;
}): Promise<void> {
  await paywallPage.expectProPaywall();
}

export async function expectOrdersWithoutPaywall({
  paywallPage,
}: {
  paywallPage: PaywallPage;
}): Promise<void> {
  await paywallPage.expectNoPaywall('Orders board');
}

export async function expectInventoryWithoutPaywall({
  paywallPage,
}: {
  paywallPage: PaywallPage;
}): Promise<void> {
  await paywallPage.expectNoPaywall('Inventory list');
}

export async function expectReportsGrowthPaywall({
  paywallPage,
}: {
  paywallPage: PaywallPage;
}): Promise<void> {
  await paywallPage.expectGrowthPaywall();
}
