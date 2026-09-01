import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { planGateLocators } from './plan-gate.locators.ts';
import type { PlanGateStory } from '../../data/stories.ts';

export class PlanGatePage extends BasePage {
  readonly path = '/iframe.html?id=plangate--orders-unlocked';
  readonly locators: ReturnType<typeof planGateLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = planGateLocators(page);
  }

  async gotoStory(story: PlanGateStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=plangate--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(
      this.page
        .getByRole('heading', { name: /Unlock / })
        .or(this.page.getByText('Orders board'))
        .or(this.page.getByText('Inventory list')),
    ).toBeVisible();
  }
}
