import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { queueSelectors } from './queue.selectors.ts';

export function queueLocators(page: Page) {
  return createLocators(page, queueSelectors);
}
