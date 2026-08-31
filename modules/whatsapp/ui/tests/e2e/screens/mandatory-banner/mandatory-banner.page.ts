import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { mandatoryBannerLocators } from './mandatory-banner.locators.ts';
import type { BannerStory } from '../../data/stories.ts';

export class MandatoryBannerPage extends BasePage {
  readonly path = '/iframe.html?id=mandatorywhatsappbanner--failed';
  readonly locators: ReturnType<typeof mandatoryBannerLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = mandatoryBannerLocators(page);
  }

  storyPath(story: BannerStory): string {
    return `/iframe.html?id=mandatorywhatsappbanner--${story}`;
  }

  async gotoStory(story: BannerStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.alert).toBeVisible();
    await expect(this.locators.bill).toBeVisible();
  }

  async acknowledge(): Promise<void> {
    await this.locators.acknowledge.click();
  }

  async expectHidden(): Promise<void> {
    await expect(this.locators.bill).toHaveCount(0);
  }

  async expectForbidden(): Promise<void> {
    await expect(this.locators.forbidden).toBeVisible();
    await expect(this.locators.bill).toBeVisible();
  }
}
