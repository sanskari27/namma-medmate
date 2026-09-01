import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { wizardSelectors } from './wizard.selectors.ts';

export function wizardLocators(page: Page) {
  return createLocators(page, wizardSelectors);
}
