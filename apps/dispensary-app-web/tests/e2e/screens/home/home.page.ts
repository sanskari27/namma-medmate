import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { homeLocators } from './home.locators.ts';

export class HomePage extends BasePage {
  readonly path = '/';
  readonly locators: ReturnType<typeof homeLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = homeLocators(page);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.sessionHeading).toBeVisible();
  }

  async expectWidgetHeading(): Promise<void> {
    await expect(this.locators.widgetHeading).toBeVisible();
  }
}
