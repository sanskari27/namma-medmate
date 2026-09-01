import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const CREATE = {
  name: 'Paracetamol 500mg',
  composition: 'Paracetamol 500mg',
  category: 'Fever',
  schedule: 'OTC',
  hsn: '3004',
  gst_slab: 12,
};

test('rejects unauthenticated catalogue access', async ({ request }) => {
  const response = await request.get('/master-catalogue/skus');
  expect(response.status()).toBe(401);
});

test('pharmacy cannot create a master SKU and GET is allowed', async ({ request }) => {
  const tokens = e2eTokens();
  const denied = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
    data: CREATE,
  });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).error.code).toBe('HQ_ONLY');
  const created = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: CREATE,
  });
  const id = (await created.json()).data.platform_master_sku_id as string;
  const read = await request.get(`/master-catalogue/skus/${id}`, {
    headers: { authorization: `Bearer ${tokens.pharmacy}` },
  });
  expect(read.status()).toBe(200);
  const gst = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { ...CREATE, gst_slab: 7 },
  });
  expect((await gst.json()).error.code).toBe('INVALID_GST_SLAB');
  const self = await request.put(`/master-catalogue/skus/${id}/substitutes`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { substitute_ids: [id] },
  });
  expect(self.status()).toBe(400);
  expect((await self.json()).error.code).toBe('VALIDATION_FAILED');
  const missingName = await request.post('/master-catalogue/skus', {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { ...CREATE, name: '' },
  });
  expect((await missingName.json()).error.code).toBe('VALIDATION_FAILED');
  const missing = await request.get(`/master-catalogue/skus/${crypto.randomUUID()}`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
  });
  expect(missing.status()).toBe(404);
  expect((await missing.json()).error.code).toBe('NOT_FOUND');
  const negative = await request.put(`/master-catalogue/skus/${id}/ceiling`, {
    headers: { authorization: `Bearer ${tokens.hq}` },
    data: { dpco_ceiling: '-1.00' },
  });
  expect((await negative.json()).error.code).toBe('INVALID_CEILING');
});
