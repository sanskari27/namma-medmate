import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { createPharmacySelectors } from './create-pharmacy-fields.selectors.ts';

export function createPharmacyLocators(page: Page) {
  return createLocators(page, createPharmacySelectors);
}
