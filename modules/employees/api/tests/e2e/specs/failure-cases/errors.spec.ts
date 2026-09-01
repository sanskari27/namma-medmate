import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('missing location_id is rejected', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get('/employees', {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.status()).toBe(400);
  expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
    'LOCATION_REQUIRED',
  );
});

test('HQ principal cannot list employees', async ({ request }) => {
  const { hq } = e2eTokens();
  const response = await request.get(`/employees?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${hq}` },
  });
  expect(response.status()).toBe(403);
});

test('incomplete pharmacist registration is 422', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.post(`/employees?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${pharmacy}` },
    data: {
      full_name: 'No Expiry',
      phone: '+919800000000',
      position: 'pharmacist',
      pharmacist_registration_no: 'KA-9',
    },
  });
  expect(response.status()).toBe(422);
});
