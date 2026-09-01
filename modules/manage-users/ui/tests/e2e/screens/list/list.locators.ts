import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { manageUsersListSelectors } from './list.selectors.ts';

export function manageUsersListLocators(page: Page) {
  return createLocators(page, manageUsersListSelectors);
}
