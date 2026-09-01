import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

test('plan-gating rejects missing authorization', async ({ request }) => {
  const response = await request.get('/plan-gating/plans');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = (await response.json()) as { success: boolean };
  expect(body.success).toBe(false);
});

test('entitlements without location_id is 400', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get('/plan-gating/entitlements', {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { error: { code: string } };
  expect(body.error.code).toBe('LOCATION_ID_REQUIRED');
});

test('HQ cannot read pharmacy entitlements', async ({ request }) => {
  const { hq } = e2eTokens();
  const response = await request.get(
    '/plan-gating/entitlements?location_id=1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
    { headers: { authorization: `Bearer ${hq}` } },
  );
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { error: { code: string } };
  expect(body.error.code).toBe('PHARMACY_SESSION_REQUIRED');
});

test('unknown paywall module is 400', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get(
    '/plan-gating/paywall?module_key=not-a-module&location_id=1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
    { headers: { authorization: `Bearer ${pharmacy}` } },
  );
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { error: { code: string } };
  expect(body.error.code).toBe('UNKNOWN_MODULE');
});

test('wrong location_id is LOCATION_TENANT_MISMATCH', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get(
    '/plan-gating/entitlements?location_id=9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210',
    { headers: { authorization: `Bearer ${pharmacy}` } },
  );
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { error: { code: string } };
  expect(body.error.code).toBe('LOCATION_TENANT_MISMATCH');
});

test('evaluate unknown module is 400', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.post('/plan-gating/evaluate', {
    headers: { authorization: `Bearer ${pharmacy}` },
    data: {
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      module_key: 'not-a-module',
      role: 'Owner',
    },
  });
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { error: { code: string } };
  expect(body.error.code).toBe('UNKNOWN_MODULE');
});
