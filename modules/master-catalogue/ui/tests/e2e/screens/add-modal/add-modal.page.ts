import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { addMedicineModalLocators } from './add-modal.locators.ts';
import type { AddModalStory } from '../../data/stories.ts';

export class AddMedicineModalPage extends BasePage {
  readonly path = '/iframe.html?id=addmedicinemodal--open';
  readonly locators: ReturnType<typeof addMedicineModalLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = addMedicineModalLocators(page);
  }

  storyPath(story: AddModalStory): string {
    return `/iframe.html?id=addmedicinemodal--${story}`;
  }

  async gotoStory(story: AddModalStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
    await expect(this.locators.title).toBeVisible();
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
    await expect(this.locators.name).toBeVisible();
    await expect(this.locators.ceilingHelp).toBeVisible();
  }
}
