import { expect, test } from '@playwright/test';

test('failure story exposes an alert', async ({ page }) => {
  await page.goto('/iframe.html?id=authwidget--failure');
  await expect(page.getByRole('alert')).toBeVisible();
});
