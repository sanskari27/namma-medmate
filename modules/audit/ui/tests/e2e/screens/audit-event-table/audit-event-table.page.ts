import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { auditEventTableLocators } from './audit-event-table.locators.ts';
import type { TableStory } from '../../data/stories.ts';

export class AuditEventTablePage extends BasePage {
  readonly path = '/iframe.html?id=auditeventtable--loaded';
  readonly locators: ReturnType<typeof auditEventTableLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = auditEventTableLocators(page);
  }

  storyPath(story: TableStory): string {
    return `/iframe.html?id=auditeventtable--${story}`;
  }

  async gotoStory(story: TableStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.time).toBeVisible();
    await expect(this.locators.billAction).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.locators.empty).toBeVisible();
  }

  async expectError(): Promise<void> {
    await expect(this.locators.error).toBeVisible();
  }
}
