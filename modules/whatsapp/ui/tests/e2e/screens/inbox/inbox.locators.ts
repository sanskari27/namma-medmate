import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { inboxSelectors } from './inbox.selectors.ts';

export function inboxLocators(page: Page) {
  return createLocators(page, inboxSelectors);
}
