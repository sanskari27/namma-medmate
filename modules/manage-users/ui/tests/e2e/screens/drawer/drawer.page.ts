import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { userDrawerLocators } from './drawer.locators.ts';
import type { DrawerStory } from '../../data/stories.ts';

export class UserDrawerPage extends BasePage {
  readonly path = '/iframe.html?id=manageuserspage--cashier-drawer';
  readonly locators: ReturnType<typeof userDrawerLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = userDrawerLocators(page);
  }

  async gotoStory(story: DrawerStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=manageuserspage--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectCopyEnabled(): Promise<void> {
    await expect(this.locators.copy).toBeEnabled();
  }

  async expectOwnerLocked(): Promise<void> {
    await expect(this.page.getByRole('checkbox', { name: 'manage-users' })).toBeDisabled();
    await expect(this.locators.remove).toHaveCount(0);
  }
}
