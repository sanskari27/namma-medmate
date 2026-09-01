import { describe, expect, it, vi } from 'vitest';
import {
  KYC_STATUSES,
  WIZARD_STATUSES,
  WIZARD_STEP_KEYS,
  createMemoryGoLiveKycRepository,
  createSqlGoLiveKycRepository,
  defaultWizardProgress,
} from '../../src/index.ts';
import { cloneProgress } from '../../src/go-live-kyc/clone.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const NOW = new Date('2026-09-01T10:00:00.000Z');

const sqlRow = {
  tenant_id: TENANT,
  location_id: LOCATION,
  display_name: 'Sri Krishna Medicals',
  kyc_status: 'pending',
  kyc_submitted_at: NOW,
  kyc_decided_at: null,
  kyc_reject_reason: null,
  kyc_gstin: '29ABCDE1234F1Z5',
  kyc_pan: 'ABCDE1234F',
  kyc_drug_licence_no: 'KA-20-123456',
  kyc_drug_licence_issue: '2022-01-15',
  kyc_drug_licence_expiry: '2027-01-14',
  kyc_fssai_no: null,
  kyc_fssai_expiry: null,
  kyc_pharmacist_name: 'Anita Sharma',
  kyc_pharmacist_registration_no: 'KA-12345',
  kyc_pharmacist_registration_expiry: '2027-03-31',
  kyc_e_invoicing_enabled: false,
  kyc_bank_account_holder: 'Anita Sharma',
  kyc_bank_account_number_ciphertext: 'sealed',
  kyc_bank_ifsc: 'HDFC0001234',
  wizard_status: 'not_started',
  wizard_completed_at: null,
  wizard_progress: defaultWizardProgress(),
  kyc_plan: 'free',
  updated_at: NOW,
};

describe('memory go-live-kyc repository', () => {
  it('ensures defaults, saves KYC, lists the queue, and stores idempotency', async () => {
    expect(KYC_STATUSES).toContain('not_submitted');
    expect(WIZARD_STATUSES).toContain('completed');
    expect(WIZARD_STEP_KEYS).toContain('1_profile');
    const repo = createMemoryGoLiveKycRepository(() => NOW);
    expect(await repo.getByTenantLocation(TENANT, LOCATION)).toBeUndefined();
    const created = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(created.kycStatus).toBe('not_submitted');
    expect(created.wizardProgress.steps['1_profile']?.status).toBe('not_started');
    expect(await repo.getByTenantLocation(TENANT, LOCATION)).toMatchObject({
      tenantId: TENANT,
      locationId: LOCATION,
    });
    const again = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(again.kycStatus).toBe('not_submitted');
    const saved = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'pending',
      kycSubmittedAt: NOW,
      kycGstin: '29ABCDE1234F1Z5',
      kycPan: 'ABCDE1234F',
      kycDrugLicenceNo: 'KA-20-123456',
      kycDrugLicenceIssue: '2022-01-15',
      kycDrugLicenceExpiry: '2027-01-14',
      kycFssaiNo: '12345678901234',
      kycFssaiExpiry: '2027-12-31',
      kycPharmacistName: 'Anita Sharma',
      kycPharmacistRegistrationNo: 'KA-12345',
      kycPharmacistRegistrationExpiry: '2027-03-31',
      kycEInvoicingEnabled: true,
      wizardStatus: 'in_progress',
      wizardProgress: defaultWizardProgress(),
      kycPlan: 'free',
    });
    expect(saved.kycStatus).toBe('pending');
    expect(saved.kycEInvoicingEnabled).toBe(true);
    const other = await repo.ensure(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Other Medicals',
    );
    await repo.save({
      tenantId: other.tenantId,
      locationId: other.locationId,
      pharmacyName: 'Other Medicals',
      kycStatus: 'pending',
      kycSubmittedAt: new Date('2026-08-01T10:00:00.000Z'),
    });
    const undated = await repo.ensure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'Undated Medicals',
    );
    await repo.save({
      tenantId: undated.tenantId,
      locationId: undated.locationId,
      pharmacyName: 'Undated Medicals',
      kycStatus: 'pending',
      kycSubmittedAt: null,
    });
    const queued = await repo.listQueue({ status: 'pending', page: 1, pageSize: 20 });
    expect(queued.total).toBe(3);
    expect(queued.items[0]?.kycGstin).toBe('29ABCDE1234F1Z5');
    expect(queued.items[2]?.kycSubmittedAt).toBeNull();
    const all = await repo.listQueue({ status: 'all', page: 1, pageSize: 20 });
    expect(all.total).toBe(3);
    expect(await repo.getIdempotency(TENANT, LOCATION, 'k1')).toBeUndefined();
    await repo.putIdempotency({
      tenantId: TENANT,
      locationId: LOCATION,
      idempotencyKey: 'k1',
      bodyHash: 'h1',
    });
    expect(await repo.getIdempotency(TENANT, LOCATION, 'k1')).toMatchObject({ bodyHash: 'h1' });
    const rejected = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'rejected',
      kycRejectReason: 'FSSAI missing',
      kycDecidedAt: NOW,
      kycSubmittedAt: NOW,
      wizardCompletedAt: NOW,
      kycBankAccountNumberCiphertext: 'sealed',
      kycBankAccountHolder: 'Anita Sharma',
      kycBankIfsc: 'HDFC0001234',
    });
    expect(rejected.kycRejectReason).toBe('FSSAI missing');
    expect(rejected.wizardCompletedAt?.toISOString()).toBe(NOW.toISOString());
    expect(rejected.kycBankAccountNumberCiphertext).toBe('sealed');
    const pendingPage = await repo.listQueue({ status: 'pending', page: 1, pageSize: 20 });
    expect(pendingPage.total).toBe(2);
    expect(cloneProgress(undefined).steps['1_profile']?.status).toBe('not_started');
    const createdBySave = await createMemoryGoLiveKycRepository(() => NOW).save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Direct save',
    });
    expect(createdBySave.kycStatus).toBe('not_submitted');
    const clockless = createMemoryGoLiveKycRepository();
    const stamped = await clockless.ensure(TENANT, LOCATION, 'Clockless');
    expect(stamped.updatedAt).toBeInstanceOf(Date);
  });
});

describe('sql go-live-kyc repository', () => {
  it('maps rows, empty progress, queue filters, and idempotency', async () => {
    const pool = {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        if (sql.includes('from go_live_kyc_idempotency')) {
          return {
            rows: [
              {
                tenant_id: TENANT,
                location_id: LOCATION,
                idempotency_key: 'k1',
                body_hash: 'h1',
              },
            ],
          };
        }
        if (sql.startsWith('insert into go_live_kyc_idempotency')) {
          return { rows: [] };
        }
        if (sql.startsWith('select count(*)')) {
          return { rows: [{ count: '1' }] };
        }
        if (sql.startsWith('update pharmacies')) {
          return { rows: [] };
        }
        if (sql.includes('where p.kyc_status')) {
          return { rows: [sqlRow] };
        }
        if (sql.includes('from pharmacies p')) {
          if (params[0] === 'missing') {
            return { rows: [] };
          }
          return { rows: [{ ...sqlRow, wizard_progress: null }] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlGoLiveKycRepository(pool as never);
    const found = await repo.getByTenantLocation(TENANT, LOCATION);
    expect(found?.pharmacyName).toBe('Sri Krishna Medicals');
    expect(found?.wizardProgress.steps['1_profile']?.status).toBe('not_started');
    expect(await repo.getByTenantLocation('missing', LOCATION)).toBeUndefined();
    const ensured = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(ensured.kycStatus).toBe('pending');
    const saved = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'approved',
    });
    expect(saved.kycStatus).toBe('pending');
    const queued = await repo.listQueue({ status: 'pending', page: 1, pageSize: 20 });
    expect(queued.items).toHaveLength(1);
    const all = await repo.listQueue({ status: 'all', page: 1, pageSize: 20 });
    expect(all.total).toBe(1);
    expect(await repo.getIdempotency(TENANT, LOCATION, 'k1')).toMatchObject({ bodyHash: 'h1' });
    await repo.putIdempotency({
      tenantId: TENANT,
      locationId: LOCATION,
      idempotencyKey: 'k1',
      bodyHash: 'h1',
    });
  });

  it('creates a default row when ensure finds nothing', async () => {
    let calls = 0;
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from pharmacies p') && sql.includes('where p.tenant_id')) {
          calls += 1;
          return calls === 1 ? { rows: [] } : { rows: [sqlRow] };
        }
        if (sql.startsWith('update pharmacies')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlGoLiveKycRepository(pool as never);
    const created = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(created.kycGstin).toBe('29ABCDE1234F1Z5');
  });

  it('saves when no current SQL row exists', async () => {
    let reads = 0;
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from pharmacies p') && sql.includes('where p.tenant_id')) {
          reads += 1;
          return reads === 1 ? { rows: [] } : { rows: [sqlRow] };
        }
        if (sql.startsWith('update pharmacies')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlGoLiveKycRepository(pool as never);
    const saved = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'pending',
    });
    expect(saved.pharmacyName).toBe('Sri Krishna Medicals');
  });

  it('returns the merged SQL row when the follow-up read is empty', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from pharmacies p')) {
          return { rows: [] };
        }
        if (sql.startsWith('update pharmacies')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlGoLiveKycRepository(pool as never);
    const saved = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'pending',
    });
    expect(saved.kycStatus).toBe('pending');
    expect(saved.pharmacyName).toBe('Sri Krishna Medicals');
  });

  it('returns undefined idempotency and empty queue counts', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from go_live_kyc_idempotency')) {
          return { rows: [] };
        }
        if (sql.startsWith('select count(*)')) {
          return { rows: [{}] };
        }
        if (sql.includes('from pharmacies p')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlGoLiveKycRepository(pool as never);
    expect(await repo.getIdempotency(TENANT, LOCATION, 'none')).toBeUndefined();
    const queued = await repo.listQueue({ status: 'all', page: 1, pageSize: 10 });
    expect(queued.total).toBe(0);
  });
});
