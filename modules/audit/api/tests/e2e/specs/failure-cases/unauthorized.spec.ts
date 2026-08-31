import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens, LOCATION, SERVICE } from '../../tokens.ts';

test('audit rejects missing authorization', async ({ request }) => {
  const response = await request.get('/audit/events');
  expect(response.status()).toBeGreaterThanOrEqual(400);
});

test('pharmacy query without location_id is 400', async ({ request }) => {
  const tokens = e2eTokens();
  const response = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe('LOCATION_ID_REQUIRED');
});

test('PATCH is not implemented', async ({ request }) => {
  const created = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-patch',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Pharmacist',
      actor_surface: 'pharmacy',
      action: 'bill_posted',
      target_type: 'Bill',
      target_id: 'INV-PATCH',
      money_or_stock: true,
      before: { qty: 1 },
      after: { qty: 0 },
    },
  });
  const id = (await created.json()).data.audit_event_id as string;
  const patched = await request.patch(`/audit/events/${id}`, {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: { action: 'mutated' },
  });
  expect([404, 405]).toContain(patched.status());
  const tokens = e2eTokens();
  const got = await request.get(`/audit/events/${id}`, {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    params: { location_id: LOCATION },
  });
  expect((await got.json()).data.action).toBe('bill_posted');
});

test('gstn_password is rejected', async ({ request }) => {
  const response = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-secret',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Owner',
      actor_surface: 'pharmacy',
      action: 'gstn_credential_edited',
      target_type: 'Pharmacy',
      target_id: 'shop',
      money_or_stock: false,
      after: { gstn_password: 'leak' },
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe('SECRET_KEY_FORBIDDEN');
});

test('PUT and DELETE are not implemented', async ({ request }) => {
  const created = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-put-delete',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Pharmacist',
      actor_surface: 'pharmacy',
      action: 'bill_posted',
      target_type: 'Bill',
      target_id: 'INV-PUT',
      money_or_stock: true,
      before: { qty: 1 },
      after: { qty: 0 },
    },
  });
  const id = (await created.json()).data.audit_event_id as string;
  const put = await request.put(`/audit/events/${id}`, {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: { action: 'mutated' },
  });
  const deleted = await request.delete(`/audit/events/${id}`, {
    headers: { authorization: `Bearer ${SERVICE}` },
  });
  expect([404, 405]).toContain(put.status());
  expect([404, 405]).toContain(deleted.status());
});

test('pharmacy cannot POST ingest', async ({ request }) => {
  const tokens = e2eTokens();
  const response = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    data: {
      idempotency_key: 'e2e-pharmacy-post',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Pharmacist',
      actor_surface: 'pharmacy',
      action: 'bill_posted',
      target_type: 'Bill',
      target_id: 'INV-PHARM',
      money_or_stock: true,
      before: { qty: 1 },
      after: { qty: 0 },
    },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe('FORBIDDEN');
});

test('other tenant GET by id is 404', async ({ request }) => {
  const created = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-other-tenant',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Pharmacist',
      actor_surface: 'pharmacy',
      action: 'bill_posted',
      target_type: 'Bill',
      target_id: 'INV-OTHER',
      money_or_stock: true,
      before: { qty: 1 },
      after: { qty: 0 },
    },
  });
  const id = (await created.json()).data.audit_event_id as string;
  const tokens = e2eTokens();
  const response = await request.get(`/audit/events/${id}`, {
    headers: { authorization: `Bearer ${tokens.otherPharmacy}` },
    params: { location_id: LOCATION },
  });
  expect(response.status()).toBe(404);
  expect((await response.json()).error.code).toBe('NOT_FOUND');
});

test('grn_posted without before is rejected', async ({ request }) => {
  const response = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-grn',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Pharmacist',
      actor_surface: 'pharmacy',
      action: 'grn_posted',
      target_type: 'GRN',
      target_id: 'grn-1',
      money_or_stock: true,
      after: { qty: 1 },
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe('BEFORE_AFTER_REQUIRED');
});
