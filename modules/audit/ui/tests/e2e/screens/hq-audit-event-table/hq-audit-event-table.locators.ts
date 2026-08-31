import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { hqAuditEventTableSelectors } from './hq-audit-event-table.selectors.ts';

export function hqAuditEventTableLocators(page: Page) {
  return createLocators(page, hqAuditEventTableSelectors);
}
