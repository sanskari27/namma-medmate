import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { shopIdentityLocators } from './shop-identity-badge.locators.ts';
import type { ShopIdentityStory } from '../../data/stories.ts';

export class ShopIdentityBadgePage extends BasePage {
  readonly path = '/iframe.html?id=tenantshell--loaded';
  readonly locators: ReturnType<typeof shopIdentityLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = shopIdentityLocators(page);
  }

  storyPath(story: ShopIdentityStory): string {
    return `/iframe.html?id=tenantshell--${story}`;
  }

  async gotoStory(story: ShopIdentityStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.badge).toBeVisible();
  }

  async expectAlertVisible(): Promise<void> {
    await expect(this.locators.alert).toBeVisible();
  }

  async expectNoLocationSwitcher(): Promise<void> {
    await expect(this.page.getByRole('combobox')).toHaveCount(0);
    await expect(this.page.getByText(/unlimited branches/i)).toHaveCount(0);
    await expect(this.page.getByText(/add branch/i)).toHaveCount(0);
  }
}
