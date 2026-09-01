import { cloneProgress, cloneRecord, emptyRecord } from './clone.ts';
import type {
  GoLiveKycIdempotencyRecord,
  GoLiveKycRecord,
  GoLiveKycRepository,
  ListKycQueueInput,
  ListKycQueueResult,
  UpsertGoLiveKycInput,
} from './types.ts';

function keyOf(tenantId: string, locationId: string): string {
  return `${tenantId}:${locationId}`;
}

export function createMemoryGoLiveKycRepository(
  now: () => Date = () => new Date(),
): GoLiveKycRepository {
  const rows = new Map<string, GoLiveKycRecord>();
  const idempotency = new Map<string, GoLiveKycIdempotencyRecord>();

  return {
    async getByTenantLocation(tenantId, locationId) {
      const row = rows.get(keyOf(tenantId, locationId));
      return row ? cloneRecord(row) : undefined;
    },

    async ensure(tenantId, locationId, pharmacyName) {
      const existing = rows.get(keyOf(tenantId, locationId));
      if (existing) {
        existing.pharmacyName = pharmacyName;
        return cloneRecord(existing);
      }
      const created = emptyRecord(tenantId, locationId, pharmacyName, now());
      rows.set(keyOf(tenantId, locationId), created);
      return cloneRecord(created);
    },

    async save(input: UpsertGoLiveKycInput) {
      const existing =
        rows.get(keyOf(input.tenantId, input.locationId)) ??
        emptyRecord(input.tenantId, input.locationId, input.pharmacyName, now());
      const next: GoLiveKycRecord = {
        ...existing,
        pharmacyName: input.pharmacyName,
        kycStatus: input.kycStatus ?? existing.kycStatus,
        kycSubmittedAt:
          input.kycSubmittedAt === undefined ? existing.kycSubmittedAt : input.kycSubmittedAt,
        kycDecidedAt: input.kycDecidedAt === undefined ? existing.kycDecidedAt : input.kycDecidedAt,
        kycRejectReason:
          input.kycRejectReason === undefined ? existing.kycRejectReason : input.kycRejectReason,
        kycGstin: input.kycGstin === undefined ? existing.kycGstin : input.kycGstin,
        kycPan: input.kycPan === undefined ? existing.kycPan : input.kycPan,
        kycDrugLicenceNo:
          input.kycDrugLicenceNo === undefined ? existing.kycDrugLicenceNo : input.kycDrugLicenceNo,
        kycDrugLicenceIssue:
          input.kycDrugLicenceIssue === undefined
            ? existing.kycDrugLicenceIssue
            : input.kycDrugLicenceIssue,
        kycDrugLicenceExpiry:
          input.kycDrugLicenceExpiry === undefined
            ? existing.kycDrugLicenceExpiry
            : input.kycDrugLicenceExpiry,
        kycFssaiNo: input.kycFssaiNo === undefined ? existing.kycFssaiNo : input.kycFssaiNo,
        kycFssaiExpiry:
          input.kycFssaiExpiry === undefined ? existing.kycFssaiExpiry : input.kycFssaiExpiry,
        kycPharmacistName:
          input.kycPharmacistName === undefined
            ? existing.kycPharmacistName
            : input.kycPharmacistName,
        kycPharmacistRegistrationNo:
          input.kycPharmacistRegistrationNo === undefined
            ? existing.kycPharmacistRegistrationNo
            : input.kycPharmacistRegistrationNo,
        kycPharmacistRegistrationExpiry:
          input.kycPharmacistRegistrationExpiry === undefined
            ? existing.kycPharmacistRegistrationExpiry
            : input.kycPharmacistRegistrationExpiry,
        kycEInvoicingEnabled: input.kycEInvoicingEnabled ?? existing.kycEInvoicingEnabled,
        kycBankAccountHolder:
          input.kycBankAccountHolder === undefined
            ? existing.kycBankAccountHolder
            : input.kycBankAccountHolder,
        kycBankAccountNumberCiphertext:
          input.kycBankAccountNumberCiphertext === undefined
            ? existing.kycBankAccountNumberCiphertext
            : input.kycBankAccountNumberCiphertext,
        kycBankIfsc: input.kycBankIfsc === undefined ? existing.kycBankIfsc : input.kycBankIfsc,
        wizardStatus: input.wizardStatus ?? existing.wizardStatus,
        wizardCompletedAt:
          input.wizardCompletedAt === undefined
            ? existing.wizardCompletedAt
            : input.wizardCompletedAt,
        wizardProgress: input.wizardProgress
          ? cloneProgress(input.wizardProgress)
          : existing.wizardProgress,
        kycPlan: input.kycPlan === undefined ? existing.kycPlan : input.kycPlan,
        updatedAt: now(),
      };
      rows.set(keyOf(input.tenantId, input.locationId), next);
      return cloneRecord(next);
    },

    async listQueue(input: ListKycQueueInput): Promise<ListKycQueueResult> {
      const filtered = [...rows.values()]
        .filter((row) => input.status === 'all' || row.kycStatus === input.status)
        .sort((a, b) => {
          const aTime = a.kycSubmittedAt?.getTime() ?? 0;
          const bTime = b.kycSubmittedAt?.getTime() ?? 0;
          return bTime - aTime;
        });
      const start = (input.page - 1) * input.pageSize;
      return {
        items: filtered.slice(start, start + input.pageSize).map(cloneRecord),
        page: input.page,
        pageSize: input.pageSize,
        total: filtered.length,
      };
    },

    async getIdempotency(tenantId, locationId, key) {
      return idempotency.get(`${tenantId}:${locationId}:${key}`);
    },

    async putIdempotency(record) {
      idempotency.set(`${record.tenantId}:${record.locationId}:${record.idempotencyKey}`, {
        ...record,
      });
    },
  };
}
