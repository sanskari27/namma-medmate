import { BasePage, expect, type Page } from '@namma-medmate/e2e-kit';
import { paywallLocators } from './paywall.locators.ts';
import type { PaywallStory, PlanGateStory } from '../../data/stories.ts';

export class PaywallPage extends BasePage {
  readonly path = '/iframe.html?id=paywall--kiosk-pro';
  readonly locators: ReturnType<typeof paywallLocators>;

  constructor(page: Page) {
    super(page);
    this.locators = paywallLocators(page);
  }

  async gotoPaywallStory(story: PaywallStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=paywall--${story}`);
  }

  async gotoPlanGateStory(story: PlanGateStory): Promise<void> {
    await this.page.goto(`/iframe.html?id=plangate--${story}`);
  }

  async expectReady(): Promise<void> {
    await expect(this.locators.title).toBeVisible();
    await expect(this.locators.cta).toBeVisible();
  }

  async expectProPaywall(): Promise<void> {
    await this.expectReady();
    await expect(this.page.getByText(/Unlock Pro/)).toBeVisible();
    await expect(this.page.getByText(/₹2999/)).toBeVisible();
  }

  async expectGrowthPaywall(): Promise<void> {
    await this.expectReady();
    await expect(this.page.getByText(/Unlock Growth/)).toBeVisible();
    await expect(this.page.getByText(/₹1499/)).toBeVisible();
  }

  async expectNoPaywall(content: string): Promise<void> {
    await expect(this.page.getByText(content)).toBeVisible();
    await expect(this.locators.cta).toHaveCount(0);
  }
}
