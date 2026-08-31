import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { authWidgetLocators } from './auth-widget.locators.ts';
import type { AuthWidgetStory } from '../../data/stories.ts';

export class AuthWidgetPage extends BasePage {
  readonly path = '/iframe.html?id=authwidget--authenticated';
  readonly locators: ReturnType<typeof authWidgetLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = authWidgetLocators(page);
  }

  storyPath(story: AuthWidgetStory): string {
    return `/iframe.html?id=authwidget--${story}`;
  }

  async gotoStory(story: AuthWidgetStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
  }

  async expectAlertVisible(): Promise<void> {
    await expect(this.locators.alert).toBeVisible();
  }
}
