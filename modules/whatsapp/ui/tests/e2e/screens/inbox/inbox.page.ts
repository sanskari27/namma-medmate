import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { inboxLocators } from './inbox.locators.ts';
import type { InboxStory } from '../../data/stories.ts';

export class InboxPage extends BasePage {
  readonly path = '/iframe.html?id=whatsappinboxpage--loaded';
  readonly locators: ReturnType<typeof inboxLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = inboxLocators(page);
  }

  storyPath(story: InboxStory): string {
    return `/iframe.html?id=whatsappinboxpage--${story}`;
  }

  async gotoStory(story: InboxStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
    await expect(this.locators.readStatus).toBeVisible();
    await expect(this.locators.otpPreview).toBeVisible();
    await expect(this.page.getByText('4821')).toHaveCount(0);
  }

  async expectEmpty(): Promise<void> {
    await expect(this.locators.heading).toBeVisible();
    await expect(this.locators.empty).toBeVisible();
  }
}
