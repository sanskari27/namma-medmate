import type { AuditEventTablePage } from './audit-event-table.page.ts';
import type { TableStory } from '../../data/stories.ts';

export async function openTableStory(
  { tablePage }: { tablePage: AuditEventTablePage },
  story: TableStory,
): Promise<void> {
  await tablePage.gotoStory(story);
}

export async function expectLoadedTable({
  tablePage,
}: {
  tablePage: AuditEventTablePage;
}): Promise<void> {
  await tablePage.expectReady();
}

export async function expectEmptyTable({
  tablePage,
}: {
  tablePage: AuditEventTablePage;
}): Promise<void> {
  await tablePage.expectEmpty();
}

export async function expectErrorTable({
  tablePage,
}: {
  tablePage: AuditEventTablePage;
}): Promise<void> {
  await tablePage.expectError();
}
