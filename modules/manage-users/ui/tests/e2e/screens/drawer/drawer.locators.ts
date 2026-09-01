import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { userDrawerSelectors } from './drawer.selectors.ts';

export function userDrawerLocators(page: Page) {
  return createLocators(page, userDrawerSelectors);
}
