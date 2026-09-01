import type { PlanGatePage } from './plan-gate.page.ts';
import type { PlanGateStory } from '../../data/stories.ts';

export async function openPlanGate(
  { planGatePage }: { planGatePage: PlanGatePage },
  story: PlanGateStory,
): Promise<void> {
  await planGatePage.gotoStory(story);
}

export async function expectOrdersReady({
  planGatePage,
}: {
  planGatePage: PlanGatePage;
}): Promise<void> {
  await planGatePage.expectReady();
}
