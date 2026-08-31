import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { hqAuditEventTableLocators } from './hq-audit-event-table.locators.ts';
import type { HqTableStory } from '../../data/stories.ts';

export class HqAuditEventTablePage extends BasePage {
  readonly path = '/iframe.html?id=hqauditeventtable--loaded';
  readonly locators: ReturnType<typeof hqAuditEventTableLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = hqAuditEventTableLocators(page);
  }

  storyPath(story: HqTableStory): string {
    return `/iframe.html?id=hqauditeventtable--${story}`;
  }

  async gotoStory(story: HqTableStory): Promise<void> {
    await this.page.goto(this.storyPath(story));
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.tenant).toBeVisible();
  }
}
