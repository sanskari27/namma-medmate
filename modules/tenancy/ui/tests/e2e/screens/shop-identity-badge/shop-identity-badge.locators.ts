import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { shopIdentitySelectors } from './shop-identity-badge.selectors.ts';

export function shopIdentityLocators(page: Page) {
  return createLocators(page, shopIdentitySelectors);
}
