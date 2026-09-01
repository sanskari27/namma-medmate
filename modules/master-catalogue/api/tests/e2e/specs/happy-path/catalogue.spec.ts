import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens, SERVICE } from '../../tokens.ts';

const CREATE = {
  name: 'Paracetamol 500mg',
  composition: 'Paracetamol 500mg',
  manufacturer: 'Example Labs',
  brand: 'Calpol',
  pack: '10 tablets',
  form: 'tablet',
  category: 'Fever',
  schedule: 'OTC',
  rx_only: false,
  hsn: '3004',
  gst_slab: 12,
  dpco_ceiling: '20.00',
};

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});

test('HQ can create, list, assert price, ban, and manage substitutes', async ({ request }) => {
  const tokens = e2eTokens();
  const created = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: CREATE,
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.platform_master_sku_id as string;
  const listed = await request.get('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    params: { q: 'Paracetamol' },
  });
  expect(listed.status()).toBe(200);
  const listedBody = await listed.json();
  expect(listedBody.data.items[0].dpco_ceiling).toBe('20.00');
  expect(listedBody.data).toHaveProperty('next_cursor');
  const paged = await request.get('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    params: { limit: 1 },
  });
  expect(paged.status()).toBe(200);
  const above = await request.post(`/master-catalogue/skus/${id}/assert-price`, {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    data: { unit_price: '21.00' },
  });
  expect((await above.json()).data.reason_code).toBe('ABOVE_DPCO_CEILING');
  const ok = await request.post(`/master-catalogue/skus/${id}/assert-price`, {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    data: { unit_price: '20.00' },
  });
  expect((await ok.json()).data.allowed).toBeTruthy();
  const alt = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { ...CREATE, name: 'Paracetamol 500mg Generic', brand: null },
  });
  const altId = (await alt.json()).data.platform_master_sku_id as string;
  const put = await request.put(`/master-catalogue/skus/${id}/substitutes`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { substitute_ids: [altId] },
  });
  expect(put.status()).toBe(200);
  const forPos = await request.get(`/master-catalogue/skus/${id}/substitutes`, {
    headers: { authorization: `Bearer ${SERVICE}` },
    params: { for_pos: true },
  });
  expect((await forPos.json()).data.items[0].platform_master_sku_id).toBe(altId);
  const bannedAlt = await request.post(`/master-catalogue/skus/${altId}/ban`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { reason: 'CDSCO ban' },
  });
  expect((await bannedAlt.json()).data.banned).toBeTruthy();
  const posAfterBan = await request.get(`/master-catalogue/skus/${id}/substitutes`, {
    headers: { authorization: `Bearer ${SERVICE}` },
    params: { for_pos: true },
  });
  expect((await posAfterBan.json()).data.items).toEqual([]);
  const banned = await request.post(`/master-catalogue/skus/${id}/ban`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { reason: 'CDSCO ban' },
  });
  expect((await banned.json()).data.banned).toBeTruthy();
  const bannedPrice = await request.post(`/master-catalogue/skus/${id}/assert-price`, {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    data: { unit_price: '1.00' },
  });
  expect((await bannedPrice.json()).data.reason_code).toBe('BANNED_SKU');
  const unbanned = await request.post(`/master-catalogue/skus/${id}/unban`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
  });
  expect((await unbanned.json()).data.banned).toBeFalsy();
  const ceiling = await request.put(`/master-catalogue/skus/${id}/ceiling`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { dpco_ceiling: '18.50' },
  });
  expect((await ceiling.json()).data.dpco_ceiling).toBe('18.50');
  const patched = await request.patch(`/master-catalogue/skus/${id}`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { category: 'Pain' },
  });
  expect((await patched.json()).data.category).toBe('Pain');
  const stocking = await request.get(`/master-catalogue/skus/${id}/stocking-pharmacies`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
  });
  expect((await stocking.json()).data.items).toEqual([]);
});
