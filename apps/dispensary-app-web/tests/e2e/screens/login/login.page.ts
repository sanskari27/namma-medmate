import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { loginLocators } from './login.locators.ts';

export class LoginPage extends BasePage {
  readonly path = '/';
  readonly locators: ReturnType<typeof loginLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = loginLocators(page);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
  }
}
