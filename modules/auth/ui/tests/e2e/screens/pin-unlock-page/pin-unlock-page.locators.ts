import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { pinUnlockSelectors } from './pin-unlock-page.selectors.ts';

export function pinUnlockLocators(page: Page) {
  return createLocators(page, pinUnlockSelectors);
}
