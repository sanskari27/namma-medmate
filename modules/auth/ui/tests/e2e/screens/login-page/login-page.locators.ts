import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { loginPageSelectors } from './login-page.selectors.ts';

export function loginPageLocators(page: Page) {
  return createLocators(page, loginPageSelectors);
}
