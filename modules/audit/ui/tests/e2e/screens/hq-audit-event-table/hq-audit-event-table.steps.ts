import type { HqAuditEventTablePage } from './hq-audit-event-table.page.ts';
import type { HqTableStory } from '../../data/stories.ts';

export async function openHqTableStory(
  { hqTablePage }: { hqTablePage: HqAuditEventTablePage },
  story: HqTableStory,
): Promise<void> {
  await hqTablePage.gotoStory(story);
}

export async function expectLoadedHqTable({
  hqTablePage,
}: {
  hqTablePage: HqAuditEventTablePage;
}): Promise<void> {
  await hqTablePage.expectReady();
}
