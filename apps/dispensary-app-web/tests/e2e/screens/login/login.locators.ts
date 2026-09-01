import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { loginSelectors } from './login.selectors.ts';

export function loginLocators(page: Page) {
  return createLocators(page, loginSelectors);
}
