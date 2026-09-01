import type { Pool } from 'pg';
import { cloneProgress, emptyRecord } from './clone.ts';
import { defaultWizardProgress } from './types.ts';
import type {
  GoLiveKycRecord,
  GoLiveKycRepository,
  KycStatus,
  ListKycQueueInput,
  UpsertGoLiveKycInput,
  WizardProgress,
  WizardStatus,
} from './types.ts';

interface KycRow {
  tenant_id: string;
  location_id: string;
  display_name: string;
  kyc_status: KycStatus;
  kyc_submitted_at: Date | null;
  kyc_decided_at: Date | null;
  kyc_reject_reason: string | null;
  kyc_gstin: string | null;
  kyc_pan: string | null;
  kyc_drug_licence_no: string | null;
  kyc_drug_licence_issue: string | null;
  kyc_drug_licence_expiry: string | null;
  kyc_fssai_no: string | null;
  kyc_fssai_expiry: string | null;
  kyc_pharmacist_name: string | null;
  kyc_pharmacist_registration_no: string | null;
  kyc_pharmacist_registration_expiry: string | null;
  kyc_e_invoicing_enabled: boolean;
  kyc_bank_account_holder: string | null;
  kyc_bank_account_number_ciphertext: string | null;
  kyc_bank_ifsc: string | null;
  wizard_status: WizardStatus;
  wizard_completed_at: Date | null;
  wizard_progress: WizardProgress | Record<string, unknown> | null;
  kyc_plan: string | null;
  updated_at: Date;
}

const SELECT = `select p.tenant_id, l.location_id, l.display_name,
  p.kyc_status, p.kyc_submitted_at, p.kyc_decided_at, p.kyc_reject_reason,
  p.kyc_gstin, p.kyc_pan, p.kyc_drug_licence_no, p.kyc_drug_licence_issue, p.kyc_drug_licence_expiry,
  p.kyc_fssai_no, p.kyc_fssai_expiry, p.kyc_pharmacist_name, p.kyc_pharmacist_registration_no,
  p.kyc_pharmacist_registration_expiry, p.kyc_e_invoicing_enabled, p.kyc_bank_account_holder,
  p.kyc_bank_account_number_ciphertext, p.kyc_bank_ifsc, p.wizard_status, p.wizard_completed_at,
  p.wizard_progress, p.kyc_plan, p.updated_at
  from pharmacies p
  join locations l on l.tenant_id = p.tenant_id`;

function parseProgress(raw: KycRow['wizard_progress']): WizardProgress {
  if (raw && typeof raw === 'object' && 'steps' in raw) {
    return cloneProgress(raw as WizardProgress);
  }
  return defaultWizardProgress();
}

function toRecord(row: KycRow): GoLiveKycRecord {
  return {
    tenantId: row.tenant_id,
    locationId: row.location_id,
    pharmacyName: row.display_name,
    kycStatus: row.kyc_status,
    kycSubmittedAt: row.kyc_submitted_at,
    kycDecidedAt: row.kyc_decided_at,
    kycRejectReason: row.kyc_reject_reason,
    kycGstin: row.kyc_gstin,
    kycPan: row.kyc_pan,
    kycDrugLicenceNo: row.kyc_drug_licence_no,
    kycDrugLicenceIssue: row.kyc_drug_licence_issue,
    kycDrugLicenceExpiry: row.kyc_drug_licence_expiry,
    kycFssaiNo: row.kyc_fssai_no,
    kycFssaiExpiry: row.kyc_fssai_expiry,
    kycPharmacistName: row.kyc_pharmacist_name,
    kycPharmacistRegistrationNo: row.kyc_pharmacist_registration_no,
    kycPharmacistRegistrationExpiry: row.kyc_pharmacist_registration_expiry,
    kycEInvoicingEnabled: row.kyc_e_invoicing_enabled,
    kycBankAccountHolder: row.kyc_bank_account_holder,
    kycBankAccountNumberCiphertext: row.kyc_bank_account_number_ciphertext,
    kycBankIfsc: row.kyc_bank_ifsc,
    wizardStatus: row.wizard_status,
    wizardCompletedAt: row.wizard_completed_at,
    wizardProgress: parseProgress(row.wizard_progress),
    kycPlan: row.kyc_plan,
    updatedAt: row.updated_at,
  };
}

export function createSqlGoLiveKycRepository(pool: Pool): GoLiveKycRepository {
  return {
    async getByTenantLocation(tenantId, locationId) {
      const result = await pool.query<KycRow>(
        `${SELECT} where p.tenant_id = $1 and l.location_id = $2`,
        [tenantId, locationId],
      );
      const row = result.rows[0];
      return row ? toRecord(row) : undefined;
    },

    async ensure(tenantId, locationId, pharmacyName) {
      const existing = await this.getByTenantLocation(tenantId, locationId);
      if (existing) {
        return existing;
      }
      return this.save(emptyRecord(tenantId, locationId, pharmacyName, new Date()));
    },

    async save(input: UpsertGoLiveKycInput) {
      const current = await this.getByTenantLocation(input.tenantId, input.locationId);
      const merged = {
        ...(current ??
          emptyRecord(input.tenantId, input.locationId, input.pharmacyName, new Date())),
        ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
        pharmacyName: input.pharmacyName,
      } as GoLiveKycRecord;
      await pool.query(
        `update pharmacies set
          kyc_status=$2, kyc_submitted_at=$3, kyc_decided_at=$4, kyc_reject_reason=$5,
          kyc_gstin=$6, kyc_pan=$7, kyc_drug_licence_no=$8, kyc_drug_licence_issue=$9,
          kyc_drug_licence_expiry=$10, kyc_fssai_no=$11, kyc_fssai_expiry=$12,
          kyc_pharmacist_name=$13, kyc_pharmacist_registration_no=$14,
          kyc_pharmacist_registration_expiry=$15, kyc_e_invoicing_enabled=$16,
          kyc_bank_account_holder=$17, kyc_bank_account_number_ciphertext=$18, kyc_bank_ifsc=$19,
          wizard_status=$20, wizard_completed_at=$21, wizard_progress=$22::jsonb, kyc_plan=$23,
          updated_at=now()
         where tenant_id=$1`,
        [
          input.tenantId,
          merged.kycStatus,
          merged.kycSubmittedAt,
          merged.kycDecidedAt,
          merged.kycRejectReason,
          merged.kycGstin,
          merged.kycPan,
          merged.kycDrugLicenceNo,
          merged.kycDrugLicenceIssue,
          merged.kycDrugLicenceExpiry,
          merged.kycFssaiNo,
          merged.kycFssaiExpiry,
          merged.kycPharmacistName,
          merged.kycPharmacistRegistrationNo,
          merged.kycPharmacistRegistrationExpiry,
          merged.kycEInvoicingEnabled,
          merged.kycBankAccountHolder,
          merged.kycBankAccountNumberCiphertext,
          merged.kycBankIfsc,
          merged.wizardStatus,
          merged.wizardCompletedAt,
          JSON.stringify(merged.wizardProgress),
          merged.kycPlan,
        ],
      );
      const saved = await this.getByTenantLocation(input.tenantId, input.locationId);
      return saved ?? merged;
    },

    async listQueue(input: ListKycQueueInput) {
      const offset = (input.page - 1) * input.pageSize;
      const statusFilter = input.status === 'all' ? '' : ' where p.kyc_status = $3';
      const countSql = `select count(*)::text as count from pharmacies p${
        input.status === 'all' ? '' : ' where p.kyc_status = $1'
      }`;
      const countResult =
        input.status === 'all'
          ? await pool.query<{ count: string }>(countSql)
          : await pool.query<{ count: string }>(countSql, [input.status]);
      const listSql = `${SELECT}${statusFilter}
        order by p.kyc_submitted_at desc nulls last
        limit $1 offset $2`;
      const listResult =
        input.status === 'all'
          ? await pool.query<KycRow>(listSql, [input.pageSize, offset])
          : await pool.query<KycRow>(
              `${SELECT} where p.kyc_status = $3
               order by p.kyc_submitted_at desc nulls last
               limit $1 offset $2`,
              [input.pageSize, offset, input.status],
            );
      return {
        items: listResult.rows.map(toRecord),
        page: input.page,
        pageSize: input.pageSize,
        total: Number(countResult.rows[0]?.count ?? 0),
      };
    },

    async getIdempotency(tenantId, locationId, key) {
      const result = await pool.query<{
        tenant_id: string;
        location_id: string;
        idempotency_key: string;
        body_hash: string;
      }>(
        `select tenant_id, location_id, idempotency_key, body_hash
         from go_live_kyc_idempotency
         where tenant_id=$1 and location_id=$2 and idempotency_key=$3`,
        [tenantId, locationId, key],
      );
      const row = result.rows[0];
      return row
        ? {
            tenantId: row.tenant_id,
            locationId: row.location_id,
            idempotencyKey: row.idempotency_key,
            bodyHash: row.body_hash,
          }
        : undefined;
    },

    async putIdempotency(record) {
      await pool.query(
        `insert into go_live_kyc_idempotency (tenant_id, location_id, idempotency_key, body_hash)
         values ($1,$2,$3,$4)
         on conflict (tenant_id, location_id, idempotency_key) do nothing`,
        [record.tenantId, record.locationId, record.idempotencyKey, record.bodyHash],
      );
    },
  };
}
