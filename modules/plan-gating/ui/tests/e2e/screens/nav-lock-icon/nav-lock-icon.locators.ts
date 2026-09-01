import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { navLockSelectors } from './nav-lock-icon.selectors.ts';

export function navLockLocators(page: Page) {
  return createLocators(page, navLockSelectors);
}
