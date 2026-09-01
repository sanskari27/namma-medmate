import type { GoLiveKycRecord, WizardProgress } from './types.ts';
import { defaultWizardProgress } from './types.ts';

export function cloneProgress(progress: WizardProgress | undefined): WizardProgress {
  const base = progress ?? defaultWizardProgress();
  return JSON.parse(JSON.stringify(base)) as WizardProgress;
}

export function cloneRecord(row: GoLiveKycRecord): GoLiveKycRecord {
  return {
    ...row,
    kycSubmittedAt: row.kycSubmittedAt ? new Date(row.kycSubmittedAt) : null,
    kycDecidedAt: row.kycDecidedAt ? new Date(row.kycDecidedAt) : null,
    wizardCompletedAt: row.wizardCompletedAt ? new Date(row.wizardCompletedAt) : null,
    updatedAt: new Date(row.updatedAt),
    wizardProgress: cloneProgress(row.wizardProgress),
  };
}

export function emptyRecord(
  tenantId: string,
  locationId: string,
  pharmacyName: string,
  now: Date,
): GoLiveKycRecord {
  return {
    tenantId,
    locationId,
    pharmacyName,
    kycStatus: 'not_submitted',
    kycSubmittedAt: null,
    kycDecidedAt: null,
    kycRejectReason: null,
    kycGstin: null,
    kycPan: null,
    kycDrugLicenceNo: null,
    kycDrugLicenceIssue: null,
    kycDrugLicenceExpiry: null,
    kycFssaiNo: null,
    kycFssaiExpiry: null,
    kycPharmacistName: null,
    kycPharmacistRegistrationNo: null,
    kycPharmacistRegistrationExpiry: null,
    kycEInvoicingEnabled: false,
    kycBankAccountHolder: null,
    kycBankAccountNumberCiphertext: null,
    kycBankIfsc: null,
    wizardStatus: 'not_started',
    wizardCompletedAt: null,
    wizardProgress: defaultWizardProgress(),
    kycPlan: null,
    updatedAt: now,
  };
}
