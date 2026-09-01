import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('missing location_id is rejected', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get('/go-live-kyc/gate', {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.status()).toBe(400);
  expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
    'LOCATION_REQUIRED',
  );
});

test('HQ principal cannot read the pharmacy gate', async ({ request }) => {
  const { hq } = e2eTokens();
  const response = await request.get(`/go-live-kyc/gate?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${hq}` },
  });
  expect(response.status()).toBe(403);
});

test('print sample must be confirmed', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.put(`/go-live-kyc/wizard/steps/4?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${pharmacy}` },
    data: { invoice_prefix: 'INV', print_sample_confirmed: false },
  });
  expect(response.status()).toBe(422);
});
