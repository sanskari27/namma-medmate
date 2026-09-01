import { expect, test } from '@namma-medmate/e2e-kit';

test('session rejects missing authorization', async ({ request }) => {
  const response = await request.get('/auth/session');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error.code).toBe('UNAUTHORIZED');
});

test('OTP request is disabled when the method is off', async ({ request }) => {
  const response = await request.post('/auth/login/otp/request', {
    data: { login_id: 'password.only' },
  });
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error.code).toBe('METHOD_DISABLED');
});
