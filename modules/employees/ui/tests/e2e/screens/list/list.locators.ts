import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { employeesListSelectors } from './list.selectors.ts';

export function employeesListLocators(page: Page) {
  return createLocators(page, employeesListSelectors);
}
