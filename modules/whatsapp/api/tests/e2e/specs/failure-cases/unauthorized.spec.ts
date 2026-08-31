import { expect, test } from '@namma-medmate/e2e-kit';

test('whatsapp rejects missing authorization', async ({ request }) => {
  const response = await request.get('/whatsapp/templates');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = await response.json();
  expect(body.success).toBe(false);
});

test('inbox without location_id is 400', async ({ request }) => {
  const response = await request.get('/whatsapp/messages', {
    headers: { authorization: 'Bearer e2e-whatsapp-service' },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe('LOCATION_ID_REQUIRED');
});

test('invalid to is rejected', async ({ request }) => {
  const response = await request.post('/whatsapp/messages', {
    headers: { authorization: 'Bearer e2e-whatsapp-service' },
    data: {
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      to: '080-12345678',
      template_key: 'refill',
      idempotency_key: 'e2e-bad-to',
    },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe('INVALID_WHATSAPP_TO');
});
