import { expect, test } from '@namma-medmate/e2e-kit';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});

test('service token can send login_otp for the seeded shop', async ({ request }) => {
  const response = await request.post('/whatsapp/messages', {
    headers: { authorization: 'Bearer e2e-whatsapp-service' },
    data: {
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      to: '+919876543210',
      template_key: 'login_otp',
      idempotency_key: 'e2e-otp-1',
      params: { otp: '4821' },
    },
  });
  expect(response.status()).toBe(202);
  const body = await response.json();
  expect(body.data.deduped).toBeFalsy();
  expect(body.data.status).toBe('sent');
});
