import { createE2eTest } from '@namma-medmate/e2e-kit';
import { AuditEventTablePage } from '../screens/audit-event-table/audit-event-table.page.ts';
import { HqAuditEventTablePage } from '../screens/hq-audit-event-table/hq-audit-event-table.page.ts';

export const test = createE2eTest({
  tablePage: AuditEventTablePage,
  hqTablePage: HqAuditEventTablePage,
});

export { expect } from '@namma-medmate/e2e-kit';
