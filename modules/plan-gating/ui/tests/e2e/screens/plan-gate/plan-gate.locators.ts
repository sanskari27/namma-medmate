import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { planGateSelectors } from './plan-gate.selectors.ts';

export function planGateLocators(page: Page) {
  return createLocators(page, planGateSelectors);
}
