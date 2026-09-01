import { expect, test } from '@namma-medmate/e2e-kit';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});

test('password login returns a pharmacy session', async ({ request }) => {
  const response = await request.post('/auth/login/password', {
    data: { login_id: 'priya.cashier', password: 'CounterPass1' },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.session_token).toMatch(/^nm_sess_/);
  expect(body.data.tenant_id).toBe('8f1c0a7e-2b3d-4e5f-8a90-123456789abc');
  expect(body.data.location_id).toBe('1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809');
});
