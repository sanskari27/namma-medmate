import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { queueLocators } from './queue.locators.ts';
import type { QueueStory } from '../../data/stories.ts';

export class HqKycQueueScreen extends BasePage {
  readonly path = '/iframe.html?id=hqkycqueuepage--pending';
  readonly locators: ReturnType<typeof queueLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = queueLocators(page);
  }

  async gotoStory(story: QueueStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=hqkycqueuepage--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
  }

  async expectApproveEnabled(): Promise<void> {
    await expect(this.locators.approve).toBeEnabled();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.locators.empty).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.locators.error).toBeVisible();
  }
}
