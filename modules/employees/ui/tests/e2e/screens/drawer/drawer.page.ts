import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { employeesDrawerLocators } from './drawer.locators.ts';

export class EmployeesDrawerPage extends BasePage {
  readonly path = '/iframe.html?id=employeespage--employee-drawer';
  readonly locators: ReturnType<typeof employeesDrawerLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = employeesDrawerLocators(page);
  }

  async gotoDrawer(): Promise<void> {
    await this.page.goto(this.path);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectIdCardEnabled(): Promise<void> {
    await expect(this.locators.idCard).toBeEnabled();
  }
}
