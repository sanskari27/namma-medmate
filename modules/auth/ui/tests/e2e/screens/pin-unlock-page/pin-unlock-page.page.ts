import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { pinUnlockLocators } from './pin-unlock-page.locators.ts';

export class PinUnlockPageScreen extends BasePage {
  readonly path = '/iframe.html?id=pinunlockpage--pin-unlock';
  readonly locators: ReturnType<typeof pinUnlockLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = pinUnlockLocators(page);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
  }
}
