import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { employeesLockLocators } from './lock.locators.ts';

export class EmployeesLockPage extends BasePage {
  readonly path = '/iframe.html?id=employeespage--plan-locked';
  readonly locators: ReturnType<typeof employeesLockLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = employeesLockLocators(page);
  }

  async gotoLock(): Promise<void> {
    await this.page.goto(this.path);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectNoDirectoryTable(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Add employee' })).toHaveCount(0);
  }
}
