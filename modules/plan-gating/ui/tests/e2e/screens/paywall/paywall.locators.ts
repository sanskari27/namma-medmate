import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { paywallSelectors } from './paywall.selectors.ts';

export function paywallLocators(page: Page) {
  return createLocators(page, paywallSelectors);
}
