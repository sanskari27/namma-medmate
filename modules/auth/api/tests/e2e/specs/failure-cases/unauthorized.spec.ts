import { expect, test } from '@namma-medmate/e2e-kit';

test('session rejects missing authorization', async ({ request }) => {
  const response = await request.get('/auth/session');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = await response.json();
  expect(body.success).toBe(false);
});
