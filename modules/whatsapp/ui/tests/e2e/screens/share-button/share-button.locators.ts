import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { shareButtonSelectors } from './share-button.selectors.ts';

export function shareButtonLocators(page: Page) {
  return createLocators(page, shareButtonSelectors);
}
