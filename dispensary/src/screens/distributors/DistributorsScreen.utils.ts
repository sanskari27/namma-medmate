import type {
  Supplier,
  SupplierInput,
  SupplierPaymentTerms,
  SupplierStatus,
} from '@/services/suppliers';
import { DISTRIBUTORS_CONTENT } from './DistributorsScreen.content';

export type DistributorsPageStatus =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type DistributorsTab = 'distributors' | 'supply' | 'compare';

export type PaymentTermsChoice =
  | 'ADVANCE'
  | 'COD'
  | 'CREDIT:7'
  | 'CREDIT:15'
  | 'CREDIT:30'
  | 'CREDIT:45';

export type DialogFormState = {
  supplierCode: string;
  legalName: string;
  contactPersonName: string;
  phone: string;
  email: string;
  gstin: string;
  drugLicenseNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  paymentTermsChoice: PaymentTermsChoice;
  status: SupplierStatus;
  /** Preserved on edit so we do not wipe bank / licence extras. */
  preserved: Partial<SupplierInput> | null;
};

export const PAYMENT_TERM_OPTIONS: { value: PaymentTermsChoice; label: string }[] = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'COD', label: 'On delivery' },
  { value: 'CREDIT:7', label: '7 days credit' },
  { value: 'CREDIT:15', label: '15 days credit' },
  { value: 'CREDIT:30', label: '30 days credit' },
  { value: 'CREDIT:45', label: '45 days credit' },
];

export function hasSupplierAccess(modules: string[] | undefined): boolean {
  return modules?.includes('PROCUREMENT') === true || modules?.includes('FINANCE') === true;
}

export function emptyDialogForm(): DialogFormState {
  return {
    supplierCode: '',
    legalName: '',
    contactPersonName: '',
    phone: '',
    email: '',
    gstin: '',
    drugLicenseNumber: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
    paymentTermsChoice: 'CREDIT:30',
    status: 'ACTIVE',
    preserved: null,
  };
}

export function paymentTermsChoiceFromSupplier(supplier: Supplier): PaymentTermsChoice {
  if (supplier.paymentTerms === 'ADVANCE') return 'ADVANCE';
  if (supplier.paymentTerms === 'COD') return 'COD';
  const days = supplier.creditPeriodDays ?? 30;
  if (days <= 7) return 'CREDIT:7';
  if (days <= 15) return 'CREDIT:15';
  if (days <= 30) return 'CREDIT:30';
  return 'CREDIT:45';
}

export function toDialogForm(supplier: Supplier): DialogFormState {
  return {
    supplierCode: supplier.supplierCode,
    legalName: supplier.legalName,
    contactPersonName: supplier.contactPersonName,
    phone: supplier.phone,
    email: supplier.email ?? '',
    gstin: supplier.gstin ?? '',
    drugLicenseNumber: supplier.drugLicenseNumber ?? '',
    addressLine1: supplier.addressLine1,
    city: supplier.city,
    state: supplier.state,
    pincode: supplier.pincode,
    paymentTermsChoice: paymentTermsChoiceFromSupplier(supplier),
    status: supplier.status === 'BLOCKED' ? 'INACTIVE' : supplier.status,
    preserved: {
      tradeName: supplier.tradeName ?? undefined,
      supplierType: supplier.supplierType,
      pan: supplier.pan ?? undefined,
      drugLicenseType: supplier.drugLicenseType,
      drugLicenseExpiry: supplier.drugLicenseExpiry ?? undefined,
      fssaiLicenseNumber: supplier.fssaiLicenseNumber ?? undefined,
      contactPersonRole: supplier.contactPersonRole ?? undefined,
      alternatePhone: supplier.alternatePhone ?? undefined,
      website: supplier.website ?? undefined,
      addressLine2: supplier.addressLine2 ?? undefined,
      country: supplier.country,
      creditLimitPaise: supplier.creditLimitPaise ?? undefined,
      bankName: supplier.bankName ?? undefined,
      accountHolderName: supplier.accountHolderName ?? undefined,
      accountNumber: supplier.accountNumber ?? undefined,
      confirmAccountNumber: supplier.accountNumber ?? undefined,
      ifscCode: supplier.ifscCode ?? undefined,
      upiId: supplier.upiId ?? undefined,
      categoryIds: [...supplier.categoryIds],
      notes: supplier.notes ?? undefined,
    },
  };
}

function parseTerms(choice: PaymentTermsChoice): {
  paymentTerms: SupplierPaymentTerms;
  creditPeriodDays?: number;
} {
  if (choice === 'ADVANCE') return { paymentTerms: 'ADVANCE' };
  if (choice === 'COD') return { paymentTerms: 'COD' };
  const days = Number(choice.split(':')[1]);
  return { paymentTerms: 'CREDIT', creditPeriodDays: days };
}

export function validateDialogForm(form: DialogFormState): boolean {
  return Boolean(
    form.legalName.trim() &&
      form.phone.trim() &&
      form.addressLine1.trim() &&
      form.city.trim() &&
      form.state.trim() &&
      form.pincode.trim(),
  );
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function generateSupplierCode(legalName: string): string {
  const slug = legalName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6);
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `SUP-${slug || 'NEW'}-${suffix}`.slice(0, 32);
}

export function toSupplierInput(form: DialogFormState, creating: boolean): SupplierInput {
  const terms = parseTerms(form.paymentTermsChoice);
  const preserved = form.preserved ?? {};
  return {
    supplierCode: creating
      ? generateSupplierCode(form.legalName)
      : form.supplierCode.trim() || generateSupplierCode(form.legalName),
    legalName: form.legalName.trim(),
    tradeName: preserved.tradeName,
    supplierType: preserved.supplierType ?? 'DISTRIBUTOR',
    gstin: optional(form.gstin),
    pan: preserved.pan,
    drugLicenseNumber: optional(form.drugLicenseNumber),
    drugLicenseType: preserved.drugLicenseType ?? null,
    drugLicenseExpiry: preserved.drugLicenseExpiry,
    fssaiLicenseNumber: preserved.fssaiLicenseNumber,
    contactPersonName: form.contactPersonName.trim() || form.legalName.trim(),
    contactPersonRole: preserved.contactPersonRole,
    phone: form.phone.trim(),
    alternatePhone: preserved.alternatePhone,
    email: optional(form.email),
    website: preserved.website,
    addressLine1: form.addressLine1.trim(),
    addressLine2: preserved.addressLine2,
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    country: preserved.country ?? 'India',
    paymentTerms: terms.paymentTerms,
    creditPeriodDays: terms.creditPeriodDays,
    creditLimitPaise: preserved.creditLimitPaise,
    bankName: preserved.bankName,
    accountHolderName: preserved.accountHolderName,
    accountNumber: preserved.accountNumber,
    confirmAccountNumber: preserved.confirmAccountNumber ?? preserved.accountNumber,
    ifscCode: preserved.ifscCode,
    upiId: preserved.upiId,
    categoryIds: preserved.categoryIds ?? [],
    status: form.status === 'BLOCKED' ? 'INACTIVE' : form.status,
    notes: preserved.notes,
  };
}

export function termsLabel(supplier: Supplier): string {
  if (supplier.paymentTerms === 'ADVANCE') return 'Advance';
  if (supplier.paymentTerms === 'COD') return 'On delivery';
  const days = supplier.creditPeriodDays ?? 30;
  return `${days} days credit`;
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPaiseWhole(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export function filterSuppliers(items: Supplier[], query: string): Supplier[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((row) => {
    const hay = [
      row.legalName,
      row.tradeName,
      row.contactPersonName,
      row.phone,
      row.email,
      row.gstin,
      row.drugLicenseNumber,
      row.city,
      row.state,
      row.supplierCode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function summaryStats(items: Supplier[]) {
  const active = items.filter((row) => row.status === 'ACTIVE');
  const products = items.reduce((sum, row) => sum + (row.productLineCount ?? row.categoryIds.length), 0);
  const outstanding = items.reduce((sum, row) => sum + (row.outstandingPaise ?? 0), 0);
  const credit = items.filter((row) => row.paymentTerms === 'CREDIT').length;
  return {
    total: items.length,
    activeCount: active.length,
    products,
    outstandingPaise: outstanding,
    creditCount: credit,
  };
}

export function mapApiStatus(error: { status: number; code: string | null }): DistributorsPageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') return 'denied';
  if (error.status === 409 || error.code === 'CODE_TAKEN' || error.code === 'GSTIN_TAKEN') {
    return 'conflict';
  }
  if (error.code === 'DUPLICATE_REFERENCE' || error.code === 'STALE_STATE') return 'conflict';
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'LICENSE_DATE_INVALID' ||
    error.code === 'UNSAFE_BANK_UPDATE' ||
    error.code === 'OVERPAYMENT' ||
    error.code === 'PLAN_LIMIT'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function statusBannerText(
  status: DistributorsPageStatus,
  hint: string | null,
): string | null {
  if (hint) return hint;
  switch (status) {
    case 'loading':
      return DISTRIBUTORS_CONTENT.status.loading;
    case 'validation':
      return DISTRIBUTORS_CONTENT.status.validation;
    case 'conflict':
      return DISTRIBUTORS_CONTENT.status.conflict;
    case 'failure':
      return DISTRIBUTORS_CONTENT.status.failure;
    case 'denied':
      return DISTRIBUTORS_CONTENT.status.denied;
    case 'success':
      return DISTRIBUTORS_CONTENT.status.success;
    default:
      return null;
  }
}
