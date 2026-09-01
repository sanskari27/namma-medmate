import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { employeesListLocators } from './list.locators.ts';
import type { PageStory } from '../../data/stories.ts';

export class EmployeesListPage extends BasePage {
  readonly path = '/iframe.html?id=employeespage--directory';
  readonly locators: ReturnType<typeof employeesListLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = employeesListLocators(page);
  }

  async gotoStory(story: PageStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=employeespage--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectAddEnabled(): Promise<void> {
    await expect(this.locators.add).toBeEnabled();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.locators.empty).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.locators.error).toBeVisible();
  }
}
