import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { homeSelectors } from './home.selectors.ts';

export function homeLocators(page: Page) {
  return createLocators(page, homeSelectors);
}
