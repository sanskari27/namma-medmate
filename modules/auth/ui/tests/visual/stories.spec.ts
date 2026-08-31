import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { stabilizePage } from '@namma-medmate/visual-regression-config';

const stories = ['loading', 'authenticated', 'unauthenticated', 'failure'];

for (const story of stories) {
  test(`visual + a11y for ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=authwidget--${story}`);
    await stabilizePage(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await expect(page).toHaveScreenshot(`${story}.png`);
  });
}
