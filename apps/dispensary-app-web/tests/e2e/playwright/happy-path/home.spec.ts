import { expect, test } from '@playwright/test';

test('home page exposes the session heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Session' })).toBeVisible();
});
