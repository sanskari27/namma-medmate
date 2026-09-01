import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('missing location_id is LOCATION_REQUIRED', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const response = await request.get('/manage-users/seats', {
    headers: { authorization: `Bearer ${pharmacy}` },
  });
  expect(response.status()).toBe(400);
  expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
    'LOCATION_REQUIRED',
  );
});

test('HQ cannot read pharmacy seats', async ({ request }) => {
  const { hq } = e2eTokens();
  const response = await request.get(`/manage-users/seats?location_id=${locationId}`, {
    headers: { authorization: `Bearer ${hq}` },
  });
  expect(response.status()).toBe(403);
});

test('Add user at the Free cap returns SEAT_CAP_REACHED', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const headers = { authorization: `Bearer ${pharmacy}` };
  const seats = await request.get(`/manage-users/seats?location_id=${locationId}`, { headers });
  const seatBody = (await seats.json()) as {
    data: { active_count: number; seat_limit: number };
  };
  let active = seatBody.data.active_count;
  while (active < seatBody.data.seat_limit) {
    const fill = await request.post(`/manage-users/users?location_id=${locationId}`, {
      headers,
      data: {
        login_id: `fill.cashier.${Date.now()}.${active}`,
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      },
    });
    if (fill.status() !== 201) {
      break;
    }
    active += 1;
  }
  const blocked = await request.post(`/manage-users/users?location_id=${locationId}`, {
    headers,
    data: {
      login_id: `extra.cashier.${Date.now()}`,
      role: 'cashier',
      password_enabled: true,
      otp_enabled: false,
    },
  });
  expect(blocked.status()).toBe(409);
  expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe(
    'SEAT_CAP_REACHED',
  );
});
