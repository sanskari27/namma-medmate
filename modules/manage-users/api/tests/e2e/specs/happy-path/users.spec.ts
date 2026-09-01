import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});

test('Owner adds a Cashier within the Free seat cap', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const created = await request.post(`/manage-users/users?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${pharmacy}` },
    data: {
      login_id: 'ravi.cashier',
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
  const seats = await request.get(`/manage-users/seats?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  const seatBody = (await seats.json()) as { data: { active_count: number; seat_limit: number } };
  expect(seatBody.data.active_count).toBe(2);
  expect(seatBody.data.seat_limit).toBe(2);
});
