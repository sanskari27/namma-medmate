import { expect, test } from '@playwright/test';

test('authenticated story announces the subject', async ({ page }) => {
  await page.goto('/iframe.html?id=authwidget--authenticated');
  await expect(page.getByRole('heading', { name: 'Dispensary session' })).toBeVisible();
});
