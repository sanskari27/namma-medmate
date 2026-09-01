import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { masterCatalogueListLocators } from './list.locators.ts';
import type { ListStory } from '../../data/stories.ts';

export class MasterCatalogueListPage extends BasePage {
  readonly path = '/iframe.html?id=mastercataloguelist--loaded';
  readonly locators: ReturnType<typeof masterCatalogueListLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = masterCatalogueListLocators(page);
  }

  storyPath(story: ListStory): string {
    return `/iframe.html?id=mastercataloguelist--${story}`;
  }

  async gotoStory(story: ListStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
    await expect(this.locators.title).toBeVisible();
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
    await expect(this.locators.medicine.first()).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.locators.empty).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.locators.error).toBeVisible();
  }

  async expectAddOpen(): Promise<void> {
    await expect(this.page.getByRole('dialog', { name: 'Add medicine' })).toBeVisible();
  }
}
