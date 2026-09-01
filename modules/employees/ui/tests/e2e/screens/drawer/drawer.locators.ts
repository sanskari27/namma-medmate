import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { employeesDrawerSelectors } from './drawer.selectors.ts';

export function employeesDrawerLocators(page: Page) {
  return createLocators(page, employeesDrawerSelectors);
}
