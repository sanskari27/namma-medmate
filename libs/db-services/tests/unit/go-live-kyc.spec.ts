import { describe, expect, it, vi } from 'vitest';
import {
  KYC_STATUSES,
  WIZARD_STATUSES,
  createMemoryGoLiveKycRepository,
  createSqlGoLiveKycRepository,
  defaultWizardProgress,
} from '../../src/index.ts';

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
    const repo = createMemoryGoLiveKycRepository(() => NOW);
    expect(await repo.getByTenantLocation(TENANT, LOCATION)).toBeUndefined();
    const created = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(created.kycStatus).toBe('not_submitted');
    expect(created.wizardProgress.steps['1_profile']?.status).toBe('not_started');
    const again = await repo.ensure(TENANT, LOCATION, 'Sri Krishna Medicals');
    expect(again.kycStatus).toBe('not_submitted');
    const saved = await repo.save({
      tenantId: TENANT,
      locationId: LOCATION,
      pharmacyName: 'Sri Krishna Medicals',
      kycStatus: 'pending',
      kycSubmittedAt: NOW,
      kycGstin: '29ABCDE1234F1Z5',
      kycEInvoicingEnabled: true,
      wizardStatus: 'in_progress',
      wizardProgress: defaultWizardProgress(),
      kycPlan: 'free',
    });
    expect(saved.kycStatus).toBe('pending');
    expect(saved.kycEInvoicingEnabled).toBe(true);
    const queued = await repo.listQueue({ status: 'pending', page: 1, pageSize: 20 });
    expect(queued.total).toBe(1);
    expect(queued.items[0]?.kycGstin).toBe('29ABCDE1234F1Z5');
    const all = await repo.listQueue({ status: 'all', page: 1, pageSize: 20 });
    expect(all.total).toBe(1);
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
    });
    expect(rejected.kycRejectReason).toBe('FSSAI missing');
  });
});

describe('sql go-live-kyc repository', () => {
  it('maps rows, empty progress, queue filters, and idempotency', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
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
          return { rows: [{ ...sqlRow, wizard_progress: {} }] };
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
