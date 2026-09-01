import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const tenantId = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';

const kycBody = {
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  drug_licence_no: 'KA-20-123456',
  drug_licence_expiry: '2027-01-14',
  pharmacist_name: 'Anita Sharma',
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
  e_invoicing_enabled: false,
  bank_account_holder: 'Anita Sharma',
  bank_account_number: '123456789012',
  bank_ifsc: 'HDFC0001234',
};

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});

test('Owner can complete wizard skips and HQ can approve KYC', async ({ request }) => {
  const { pharmacy, hq } = e2eTokens();
  const headers = { authorization: `Bearer ${pharmacy}` };
  const loc = `location_id=${locationId}`;
  const gate = await request.get(`/go-live-kyc/gate?${loc}`, { headers });
  expect(gate.status()).toBe(200);
  expect(((await gate.json()) as { data: { allowed: boolean } }).data.allowed).toBe(false);
  await request.put(`/go-live-kyc/wizard/steps/1?${loc}`, {
    headers,
    data: {
      gstin: kycBody.gstin,
      drug_licence_no: kycBody.drug_licence_no,
      drug_licence_expiry: kycBody.drug_licence_expiry,
      pharmacist_name: kycBody.pharmacist_name,
      pharmacist_registration_no: kycBody.pharmacist_registration_no,
      pharmacist_registration_expiry: kycBody.pharmacist_registration_expiry,
      e_invoicing_enabled: false,
    },
  });
  await request.post(`/go-live-kyc/wizard/steps/2?${loc}`, {
    headers,
    data: { zero_stock: true },
  });
  await request.put(`/go-live-kyc/wizard/steps/3?${loc}`, {
    headers,
    data: { start_at_zero: true },
  });
  await request.put(`/go-live-kyc/wizard/steps/4?${loc}`, {
    headers,
    data: { invoice_prefix: 'INV', print_sample_confirmed: true },
  });
  await request.put(`/go-live-kyc/wizard/steps/5?${loc}`, {
    headers,
    data: { owner_only: true, owner_pin: '4455' },
  });
  await request.post(`/go-live-kyc/wizard/complete?${loc}`, { headers });
  await request.put(`/go-live-kyc/kyc?${loc}`, { headers, data: kycBody });
  const approved = await request.post(
    `/go-live-kyc/admin/pharmacies/${tenantId}/kyc/approve?${loc}`,
    { headers: { authorization: `Bearer ${hq}` } },
  );
  expect(approved.status()).toBe(200);
  const open = await request.get(`/go-live-kyc/gate?${loc}`, { headers });
  expect(((await open.json()) as { data: { allowed: boolean } }).data.allowed).toBe(true);
});
