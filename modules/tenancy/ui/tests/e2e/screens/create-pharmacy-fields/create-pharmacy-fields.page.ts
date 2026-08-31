import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { createPharmacyLocators } from './create-pharmacy-fields.locators.ts';

export class CreatePharmacyFieldsPage extends BasePage {
  readonly path = '/iframe.html?id=createpharmacyfields--empty';
  readonly locators: ReturnType<typeof createPharmacyLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = createPharmacyLocators(page);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
  }
}
