import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { status: string };
  expect(body.status).toBe('ok');
});

test('new pharmacy entitlements are Free and can bill', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get(`/plan-gating/entitlements?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: {
      plan: string;
      effective_plan: string;
      seatsLimit: number;
      modules: Record<string, boolean>;
    };
  };
  expect(body.data.plan).toBe('free');
  expect(body.data.effective_plan).toBe('free');
  expect(body.data.seatsLimit).toBe(2);
  expect(body.data.modules['pos-billing']).toBe(true);
  expect(body.data.modules.orders).toBe(true);
  expect(body.data.modules.kiosk).toBe(false);
  expect(body.data.modules.crm).toBe(false);
});

test('plans catalogue has no extra-seat product', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get('/plan-gating/plans', {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: { items: Array<{ plan: string; seats_limit: number | null }> };
  };
  expect(body.data.items.map((item) => item.plan)).toEqual(['free', 'starter', 'growth', 'pro']);
  expect(body.data.items.some((item) => item.plan.includes('seat'))).toBe(false);
  const pro = body.data.items.find((item) => item.plan === 'pro');
  expect(pro?.seats_limit).toBeNull();
});

test('paywall for kiosk names Pro at 2999', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get(
    `/plan-gating/paywall?module_key=kiosk&location_id=${locationId}`,
    { headers: { authorization: `Bearer ${pharmacy}` } },
  );
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: { unlocked: boolean; required_plan: string; monthly_inr: number };
  };
  expect(body.data.unlocked).toBe(false);
  expect(body.data.required_plan).toBe('pro');
  expect(body.data.monthly_inr).toBe(2999);
});
