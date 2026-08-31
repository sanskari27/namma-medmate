import { expect, type Page } from '@playwright/test';
import { stabilizePage } from './stabilize-page.ts';

export async function expectScreenshot(page: Page, name: string): Promise<void> {
  await stabilizePage(page);
  await expect(page).toHaveScreenshot(name);
}
