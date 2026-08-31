import { expect, test } from '@namma-medmate/e2e-kit';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});
