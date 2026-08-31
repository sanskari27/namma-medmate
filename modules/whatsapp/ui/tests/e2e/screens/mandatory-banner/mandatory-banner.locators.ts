import { createLocators, type Page } from '@namma-medmate/e2e-kit';
import { mandatoryBannerSelectors } from './mandatory-banner.selectors.ts';

export function mandatoryBannerLocators(page: Page) {
  return createLocators(page, mandatoryBannerSelectors);
}
