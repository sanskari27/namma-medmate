import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens, LOCATION, SERVICE } from '../../tokens.ts';

function billBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: 'e2e-bill-1',
    tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
    location_id: LOCATION,
    actor_user_id: 'user-111',
    actor_role: 'Pharmacist',
    actor_surface: 'pharmacy',
    action: 'bill_posted',
    target_type: 'Bill',
    target_id: 'INV-24-00018',
    money_or_stock: true,
    before: { batch_qty: { 'SKU1:B1': 10 } },
    after: { batch_qty: { 'SKU1:B1': 8 } },
    ...overrides,
  };
}

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});

test('bill_posted ingest is queryable and idempotent', async ({ request }) => {
  const created = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: billBody(),
  });
  expect(created.status()).toBe(201);
  const first = await created.json();
  const again = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: billBody(),
  });
  expect(again.status()).toBe(200);
  expect((await again.json()).data.deduped).toBeTruthy();
  await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: billBody({
      idempotency_key: 'e2e-duty',
      action: 'duty_clock_in',
      target_type: 'DutyShift',
      target_id: 'shift-1',
      money_or_stock: false,
      before: undefined,
      after: undefined,
    }),
  });
  await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: billBody({
      idempotency_key: 'e2e-khata',
      action: 'khata_repayment_posted',
      target_type: 'KhataLedger',
      target_id: 'khata-1',
      money_or_stock: true,
      before: { balance: '10.00' },
      after: { balance: '0.00' },
    }),
  });
  const tokens = e2eTokens();
  const listed = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    params: { location_id: LOCATION, target_id: 'INV-24-00018' },
  });
  expect(listed.status()).toBe(200);
  const page = await listed.json();
  expect(page.data.items).toHaveLength(1);
  expect(page.data.items[0].audit_event_id).toBe(first.data.audit_event_id);
  const ranged = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    params: {
      location_id: LOCATION,
      from: '2020-01-01T00:00:00.000Z',
      to: '2099-01-01T00:00:00.000Z',
    },
  });
  const actions = ((await ranged.json()).data.items as { action: string }[]).map(
    (row) => row.action,
  );
  expect(actions).toContain('duty_clock_in');
  expect(actions).toContain('khata_repayment_posted');
});

test('gstn credential edit stores a redacted after snapshot', async ({ request }) => {
  const response = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-gstn-ok',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
      actor_user_id: 'user-111',
      actor_role: 'Owner',
      actor_surface: 'pharmacy',
      action: 'gstn_credential_edited',
      target_type: 'Pharmacy',
      target_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      money_or_stock: false,
      after: { updated: true, ref: 'secret-ref-1' },
    },
  });
  expect(response.status()).toBe(201);
});

test('HQ can query platform-only events', async ({ request }) => {
  const ingested = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: {
      idempotency_key: 'e2e-hq-admin',
      tenant_id: null,
      location_id: null,
      actor_user_id: 'hq-ops-1',
      actor_role: 'Ops',
      actor_surface: 'hq',
      action: 'admin_action',
      target_type: 'PlatformWaba',
      target_id: 'namma-medmate',
      money_or_stock: false,
      after: { rotated: true },
    },
  });
  expect(ingested.status()).toBe(201);
  const shopIngest = await request.post('/audit/events', {
    headers: { authorization: `Bearer ${SERVICE}` },
    data: billBody({
      idempotency_key: 'e2e-hq-shop',
      target_id: 'INV-HQ-SHOP',
    }),
  });
  expect(shopIngest.status()).toBe(201);
  const tokens = e2eTokens();
  const listed = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.hq}` },
  });
  expect(listed.status()).toBe(200);
  const actions = ((await listed.json()).data.items as { action: string }[]).map(
    (row) => row.action,
  );
  expect(actions).toContain('admin_action');
  const pharmacy = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    params: { location_id: LOCATION },
  });
  expect(pharmacy.status()).toBe(200);
  const pharmacyRows = (await pharmacy.json()).data.items as {
    action: string;
    tenant_id: string | null;
  }[];
  expect(pharmacyRows.length).toBeGreaterThan(0);
  expect(pharmacyRows.every((row) => row.tenant_id)).toBeTruthy();
  expect(pharmacyRows.map((row) => row.action)).not.toContain('admin_action');
  const shop = await request.get('/audit/events', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    params: {
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: LOCATION,
    },
  });
  expect(shop.status()).toBe(200);
  const shopRows = (await shop.json()).data.items as { tenant_id: string; action: string }[];
  expect(shopRows.length).toBeGreaterThan(0);
  expect(shopRows.every((row) => row.tenant_id === '8f1c0a7e-2b3d-4e5f-8a90-123456789abc')).toBe(
    true,
  );
  expect(shopRows.map((row) => row.action)).not.toContain('admin_action');
});
