import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { masterCatalogueDrawerSelectors } from './drawer.selectors.ts';

export function masterCatalogueDrawerLocators(page: Page) {
  return createLocators(page, masterCatalogueDrawerSelectors);
}
