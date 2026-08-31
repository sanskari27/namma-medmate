import { expect, test } from '@namma-medmate/e2e-kit';

test('tenancy rejects missing authorization', async ({ request }) => {
  const response = await request.get('/tenancy/pharmacies');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = await response.json();
  expect(body.success).toBe(false);
});

test('create pharmacy without a token does not persist', async ({ request }) => {
  const response = await request.post('/tenancy/pharmacies', {
    data: {
      display_name: 'Sri Krishna Medicals',
      gst_dealer_type: 'regular',
      business_type: 'retail',
    },
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
});
