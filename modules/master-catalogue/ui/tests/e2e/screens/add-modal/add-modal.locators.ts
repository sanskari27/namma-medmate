import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { addMedicineModalSelectors } from './add-modal.selectors.ts';

export function addMedicineModalLocators(page: Page) {
  return createLocators(page, addMedicineModalSelectors);
}
