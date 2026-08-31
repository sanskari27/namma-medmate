import { expectLoadedTable } from '../screens/audit-event-table/audit-event-table.steps.ts';
import type { AuditEventTablePage } from '../screens/audit-event-table/audit-event-table.page.ts';

export async function reachLoadedTable({ tablePage }: { tablePage: AuditEventTablePage }) {
  await tablePage.gotoStory('loaded');
  await expectLoadedTable({ tablePage });
}
