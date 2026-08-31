import { expect, test } from '@playwright/test';

test('home page remains reachable without a token', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dispensary session' })).toBeVisible();
});
