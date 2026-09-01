import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { wizardLocators } from './wizard.locators.ts';
import type { WizardStory } from '../../data/stories.ts';

export class GoLiveWizardScreen extends BasePage {
  readonly path = '/iframe.html?id=golivewizardpage--start';
  readonly locators: ReturnType<typeof wizardLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = wizardLocators(page);
  }

  async gotoStory(story: WizardStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=golivewizardpage--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectRejected(): Promise<void> {
    await expect(this.locators.rejected).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.locators.error).toBeVisible();
  }

  async expectRerun(): Promise<void> {
    await expect(this.locators.rerun).toBeVisible();
  }
}
