import { expect, test } from '@namma-medmate/e2e-kit';
import { e2eTokens } from '../../tokens.ts';

const locationId = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

test('health is mounted by lambda-bootstrap', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
});

test('Owner creates a pharmacist and exports CSV', async ({ request }) => {
  const { pharmacy } = e2eTokens();
  const headers = { authorization: `Bearer ${pharmacy}` };
  const created = await request.post(`/employees?location_id=${locationId}`, {
    headers,
    data: {
      full_name: 'Anita Sharma',
      phone: '+919812345678',
      position: 'pharmacist',
      pharmacist_registration_no: 'KA-12345',
      pharmacist_registration_expiry: '2027-03-31',
    },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as { data: { employee_id: string; employee_code: string } };
  expect(body.data.employee_code).toMatch(/^EMP-/);
  const eligible = await request.get(`/employees/pharmacist-eligible?location_id=${locationId}`, {
    headers,
  });
  expect(eligible.status()).toBe(200);
  const csv = await request.get(`/employees/export.csv?location_id=${locationId}`, { headers });
  expect(csv.headers()['content-type']).toMatch(/csv/);
  const pdf = await request.get(
    `/employees/${body.data.employee_id}/id-card.pdf?location_id=${locationId}`,
    { headers },
  );
  expect(pdf.status()).toBe(200);
});
