import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { employeesLockPageSelectors } from './lock.selectors.ts';

export function employeesLockLocators(page: Page) {
  return createLocators(page, employeesLockPageSelectors);
}
