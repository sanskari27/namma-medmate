import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { navLockLocators } from './nav-lock-icon.locators.ts';

export class NavLockIconPage extends BasePage {
  readonly path = '/iframe.html?id=navlockicon--locked';
  readonly locators: ReturnType<typeof navLockLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = navLockLocators(page);
  }

  async gotoLocked(): Promise<void> {
    await this.page.goto(this.path);
  }

  async gotoUnlocked(): Promise<void> {
    await this.page.goto('/iframe.html?id=navlockicon--unlocked');
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.lock).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.locators.lock).toHaveCount(0);
  }
}
