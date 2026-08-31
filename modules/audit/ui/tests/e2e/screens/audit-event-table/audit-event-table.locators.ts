import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { auditEventTableSelectors } from './audit-event-table.selectors.ts';

export function auditEventTableLocators(page: Page) {
  return createLocators(page, auditEventTableSelectors);
}
