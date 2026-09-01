import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});

test('Owner adds a Cashier within the Free seat cap', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const headers = { authorization: `Bearer ${pharmacy}` };
  const seats = await request.get(`/manage-users/seats?location_id=${locationId}`, { headers });
  const seatBody = (await seats.json()) as {
    data: { active_count: number; seat_limit: number };
  };
  if (seatBody.data.active_count >= seatBody.data.seat_limit) {
    const listed = await request.get(`/manage-users/users?location_id=${locationId}`, { headers });
    const page = (await listed.json()) as {
      data: { items: Array<{ user_id: string; role: string; active: boolean }> };
    };
    const spare = page.data.items.find((item) => item.role !== 'owner' && item.active);
    if (spare) {
      await request.patch(`/manage-users/users/${spare.user_id}?location_id=${locationId}`, {
        headers,
        data: { active: false },
      });
    }
  }
  const created = await request.post(`/manage-users/users?location_id=${locationId}`, {
    headers,
    data: {
      login_id: `ravi.cashier.${Date.now()}`,
      role: 'cashier',
      password_enabled: true,
      otp_enabled: false,
    },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as {
    data: { temp_password: string; role: string; permissions: Record<string, boolean> };
  };
  expect(body.data.temp_password).toBeTruthy();
  expect(body.data.role).toBe('cashier');
  expect(body.data.permissions['pos-billing']).toBe(true);
  const after = await request.get(`/manage-users/seats?location_id=${locationId}`, { headers });
  const afterBody = (await after.json()) as { data: { active_count: number; seat_limit: number } };
  expect(afterBody.data.seat_limit).toBe(2);
  expect(afterBody.data.active_count).toBeGreaterThanOrEqual(2);
});
