import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { masterCatalogueListSelectors } from './list.selectors.ts';

export function masterCatalogueListLocators(page: Page) {
  return createLocators(page, masterCatalogueListSelectors);
}
