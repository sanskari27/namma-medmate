export const KYC_STATUSES = ['not_submitted', 'pending', 'approved', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const WIZARD_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export type WizardStatus = (typeof WIZARD_STATUSES)[number];

export const STEP_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const WIZARD_STEP_KEYS = [
  '1_profile',
  '2_opening_stock',
  '3_opening_books',
  '4_invoice',
  '5_first_user',
] as const;
export type WizardStepKey = (typeof WIZARD_STEP_KEYS)[number];

export interface WizardStepState {
  status: StepStatus;
  updated_at?: string;
  zero_stock?: boolean;
  ingest_id?: string | null;
  ingest_pending?: boolean;
  object_key?: string;
  start_at_zero?: boolean;
  journal_ids?: string[];
  invoice_prefix?: string;
  print_sample_confirmed?: boolean;
  owner_only?: boolean;
  created_user_id?: string | null;
  owner_pin_set?: boolean;
  opening_stock_already_posted?: boolean;
  opening_books_already_posted?: boolean;
}

export type WizardProgress = {
  steps: Record<WizardStepKey, WizardStepState>;
};

export function defaultWizardProgress(): WizardProgress {
  return {
    steps: {
      '1_profile': { status: 'not_started' },
      '2_opening_stock': { status: 'not_started' },
      '3_opening_books': { status: 'not_started' },
      '4_invoice': { status: 'not_started' },
      '5_first_user': { status: 'not_started' },
    },
  };
}

export interface GoLiveKycRecord {
  tenantId: string;
  locationId: string;
  pharmacyName: string;
  kycStatus: KycStatus;
  kycSubmittedAt: Date | null;
  kycDecidedAt: Date | null;
  kycRejectReason: string | null;
  kycGstin: string | null;
  kycPan: string | null;
  kycDrugLicenceNo: string | null;
  kycDrugLicenceIssue: string | null;
  kycDrugLicenceExpiry: string | null;
  kycFssaiNo: string | null;
  kycFssaiExpiry: string | null;
  kycPharmacistName: string | null;
  kycPharmacistRegistrationNo: string | null;
  kycPharmacistRegistrationExpiry: string | null;
  kycEInvoicingEnabled: boolean;
  kycBankAccountHolder: string | null;
  kycBankAccountNumberCiphertext: string | null;
  kycBankIfsc: string | null;
  wizardStatus: WizardStatus;
  wizardCompletedAt: Date | null;
  wizardProgress: WizardProgress;
  kycPlan: string | null;
  updatedAt: Date;
}

export interface UpsertGoLiveKycInput {
  tenantId: string;
  locationId: string;
  pharmacyName: string;
  kycStatus?: KycStatus;
  kycSubmittedAt?: Date | null;
  kycDecidedAt?: Date | null;
  kycRejectReason?: string | null;
  kycGstin?: string | null;
  kycPan?: string | null;
  kycDrugLicenceNo?: string | null;
  kycDrugLicenceIssue?: string | null;
  kycDrugLicenceExpiry?: string | null;
  kycFssaiNo?: string | null;
  kycFssaiExpiry?: string | null;
  kycPharmacistName?: string | null;
  kycPharmacistRegistrationNo?: string | null;
  kycPharmacistRegistrationExpiry?: string | null;
  kycEInvoicingEnabled?: boolean;
  kycBankAccountHolder?: string | null;
  kycBankAccountNumberCiphertext?: string | null;
  kycBankIfsc?: string | null;
  wizardStatus?: WizardStatus;
  wizardCompletedAt?: Date | null;
  wizardProgress?: WizardProgress;
  kycPlan?: string | null;
}

export interface ListKycQueueInput {
  status: KycStatus | 'all';
  page: number;
  pageSize: number;
}

export interface ListKycQueueResult {
  items: GoLiveKycRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface GoLiveKycIdempotencyRecord {
  tenantId: string;
  locationId: string;
  idempotencyKey: string;
  bodyHash: string;
}

export interface GoLiveKycRepository {
  getByTenantLocation(tenantId: string, locationId: string): Promise<GoLiveKycRecord | undefined>;
  ensure(tenantId: string, locationId: string, pharmacyName: string): Promise<GoLiveKycRecord>;
  save(input: UpsertGoLiveKycInput): Promise<GoLiveKycRecord>;
  listQueue(input: ListKycQueueInput): Promise<ListKycQueueResult>;
  getIdempotency(
    tenantId: string,
    locationId: string,
    key: string,
  ): Promise<GoLiveKycIdempotencyRecord | undefined>;
  putIdempotency(record: GoLiveKycIdempotencyRecord): Promise<void>;
}
