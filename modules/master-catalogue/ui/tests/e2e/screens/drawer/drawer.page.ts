import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { masterCatalogueDrawerLocators } from './drawer.locators.ts';
import type { DrawerStory } from '../../data/stories.ts';

export class MasterCatalogueDrawerPage extends BasePage {
  readonly path = '/iframe.html?id=mastercataloguedrawer--loaded';
  readonly locators: ReturnType<typeof masterCatalogueDrawerLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = masterCatalogueDrawerLocators(page);
  }

  storyPath(story: DrawerStory): string {
    return `/iframe.html?id=mastercataloguedrawer--${story}`;
  }

  async gotoStory(story: DrawerStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
    await expect(this.locators.ceilingHelp).toBeVisible();
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.ceilingHelp).toBeVisible();
    await expect(this.locators.shop).toBeVisible();
  }

  async expectEmptyStocking(): Promise<void> {
    await expect(this.locators.emptyStocking).toBeVisible();
  }

  async expectBanConfirm(): Promise<void> {
    await expect(this.locators.confirm).toBeVisible();
  }
}
