import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { manageUsersListLocators } from './list.locators.ts';
import type { ListStory } from '../../data/stories.ts';

export class ManageUsersPage extends BasePage {
  readonly path = '/iframe.html?id=manageuserspage--free-with-seat';
  readonly locators: ReturnType<typeof manageUsersListLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = manageUsersListLocators(page);
  }

  async gotoStory(story: ListStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=manageuserspage--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectAddEnabled(): Promise<void> {
    await expect(this.locators.add).toBeEnabled();
  }

  async expectAddDisabled(): Promise<void> {
    await expect(this.locators.add).toBeDisabled();
    await expect(this.locators.capMessage).toBeVisible();
  }
}
