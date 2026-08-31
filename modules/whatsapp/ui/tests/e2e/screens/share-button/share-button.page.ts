import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { shareButtonLocators } from './share-button.locators.ts';
import type { ShareStory } from '../../data/stories.ts';

export class ShareButtonPage extends BasePage {
  readonly path = '/iframe.html?id=sharewhatsappbutton--ready';
  readonly locators: ReturnType<typeof shareButtonLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = shareButtonLocators(page);
  }

  storyPath(story: ShareStory): string {
    return `/iframe.html?id=sharewhatsappbutton--${story}`;
  }

  async gotoStory(story: ShareStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.share).toBeVisible();
  }

  async share(): Promise<void> {
    await this.locators.share.click();
  }

  async expectOpened(): Promise<void> {
    await expect(this.locators.opened).toBeVisible();
  }
}
