import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { loginPageLocators } from './login-page.locators.ts';
import type { LoginPageStory } from '../../data/stories.ts';

export class LoginPageScreen extends BasePage {
  readonly path = '/iframe.html?id=loginpage--both-methods';
  readonly locators: ReturnType<typeof loginPageLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = loginPageLocators(page);
  }

  storyPath(story: LoginPageStory): string {
    return `/iframe.html?id=loginpage--${story}`;
  }

  async gotoStory(story: LoginPageStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
  }

  async expectMethodsVisible(): Promise<void> {
    await expect(this.locators.password).toBeVisible();
    await expect(this.locators.otp).toBeVisible();
  }

  async expectAlertVisible(): Promise<void> {
    await expect(this.locators.alert).toBeVisible();
  }
}
