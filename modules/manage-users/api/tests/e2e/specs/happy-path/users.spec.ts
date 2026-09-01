import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});

test('Owner manages a Cashier through the staff-user contract', async ({ request }) => {
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
    data: {
      user_id: string;
      temp_password: string;
      role: string;
      permissions: Record<string, boolean>;
    };
  };
  expect(body.data.temp_password).toBeTruthy();
  expect(body.data.role).toBe('cashier');
  expect(body.data.permissions['pos-billing']).toBe(true);
  const userId = body.data.user_id;
  const after = await request.get(`/manage-users/seats?location_id=${locationId}`, { headers });
  const afterBody = (await after.json()) as { data: { active_count: number; seat_limit: number } };
  expect(afterBody.data.seat_limit).toBe(2);
  expect(afterBody.data.active_count).toBeGreaterThanOrEqual(2);

  const listed = await request.get(
    `/manage-users/users?location_id=${locationId}&page=1&page_size=20`,
    { headers },
  );
  expect(listed.status()).toBe(200);
  const detail = await request.get(`/manage-users/users/${userId}?location_id=${locationId}`, {
    headers,
  });
  expect(detail.status()).toBe(200);
  expect(
    ((await detail.json()) as { data: { saved_devices: unknown[] } }).data.saved_devices,
  ).toEqual([]);
  const patched = await request.patch(`/manage-users/users/${userId}?location_id=${locationId}`, {
    headers,
    data: { login_id: `ravi.cashier.patch.${Date.now()}` },
  });
  expect(patched.status()).toBe(200);
  const perms = await request.put(
    `/manage-users/users/${userId}/permissions?location_id=${locationId}`,
    { headers, data: { mode: 'reset_defaults' } },
  );
  expect(perms.status()).toBe(200);
  const methods = await request.put(
    `/manage-users/users/${userId}/methods?location_id=${locationId}`,
    { headers, data: { password_enabled: true, otp_enabled: false } },
  );
  expect(methods.status()).toBe(200);
  const copy = await request.post(
    `/manage-users/users/${userId}/password/copy?location_id=${locationId}`,
    { headers },
  );
  expect(copy.status()).toBe(200);
  const reset = await request.post(
    `/manage-users/users/${userId}/password/reset?location_id=${locationId}`,
    { headers },
  );
  expect(reset.status()).toBe(200);
  const pin = await request.put(`/manage-users/users/${userId}/pin?location_id=${locationId}`, {
    headers,
    data: { pin: '4455' },
  });
  expect(pin.status()).toBe(200);
  const pinOff = await request.delete(
    `/manage-users/users/${userId}/pin?location_id=${locationId}`,
    {
      headers,
    },
  );
  expect(pinOff.status()).toBe(200);
  const devices = await request.get(
    `/manage-users/users/${userId}/devices?location_id=${locationId}`,
    { headers },
  );
  expect(devices.status()).toBe(200);
  const revokeAll = await request.delete(
    `/manage-users/users/${userId}/devices?location_id=${locationId}`,
    { headers },
  );
  expect(revokeAll.status()).toBe(200);
  const share = await request.post(
    `/manage-users/users/${userId}/share-link?location_id=${locationId}`,
    { headers },
  );
  expect(share.status()).toBe(200);
  const shareBody = (await share.json()) as { data: { sent: boolean; url: string } };
  expect(shareBody.data.sent).toBe(false);
  expect(shareBody.data.url).toContain('https://wa.me/');
  const ownerLock = await request.patch(
    `/manage-users/users/${ownerId}?location_id=${locationId}`,
    { headers, data: { role: 'manager' } },
  );
  expect(ownerLock.status()).toBe(409);
  const removed = await request.delete(`/manage-users/users/${userId}?location_id=${locationId}`, {
    headers,
  });
  expect(removed.status()).toBe(204);
});
