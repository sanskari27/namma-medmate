import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { authWidgetSelectors } from './auth-widget.selectors.ts';

export function authWidgetLocators(page: Page) {
  return createLocators(page, authWidgetSelectors);
}
