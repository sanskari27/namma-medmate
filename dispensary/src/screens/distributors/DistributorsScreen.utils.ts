import type { ProductCategory } from '@/services/productCategories';
import type {
  DrugLicenseType,
  Supplier,
  SupplierInput,
  SupplierLicenseStatus,
  SupplierPaymentTerms,
  SupplierStatus,
  SupplierType,
} from '@/services/suppliers';
import { AlertCircle, BadgeCheck, Truck, Unplug } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FormState = {
  supplierCode: string;
  legalName: string;
  tradeName: string;
  supplierType: SupplierType;
  gstin: string;
  pan: string;
  drugLicenseNumber: string;
  drugLicenseType: DrugLicenseType | '';
  drugLicenseExpiry: string;
  fssaiLicenseNumber: string;
  contactPersonName: string;
  contactPersonRole: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  paymentTerms: SupplierPaymentTerms;
  creditPeriodDays: string;
  creditLimitRupees: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  upiId: string;
  categoryIds: string[];
  status: SupplierStatus;
  notes: string;
};

export const SUPPLIER_TYPES: SupplierType[] = [
  'DISTRIBUTOR',
  'WHOLESALER',
  'MANUFACTURER',
  'SUPER_STOCKIST',
];

export const PAYMENT_TERMS: SupplierPaymentTerms[] = ['COD', 'ADVANCE', 'CREDIT'];

export const SUPPLIER_STATUSES: SupplierStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

export const LICENSE_TYPES: DrugLicenseType[] = ['WHOLESALE', 'RETAIL', 'MANUFACTURING'];

export const emptyForm: FormState = {
  supplierCode: '',
  legalName: '',
  tradeName: '',
  supplierType: 'DISTRIBUTOR',
  gstin: '',
  pan: '',
  drugLicenseNumber: '',
  drugLicenseType: '',
  drugLicenseExpiry: '',
  fssaiLicenseNumber: '',
  contactPersonName: '',
  contactPersonRole: '',
  phone: '',
  alternatePhone: '',
  email: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  paymentTerms: 'COD',
  creditPeriodDays: '',
  creditLimitRupees: '',
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  upiId: '',
  categoryIds: [],
  status: 'ACTIVE',
  notes: '',
};

export function hasSupplierAccess(modules: string[] | undefined): boolean {
  return modules?.includes('PROCUREMENT') === true || modules?.includes('FINANCE') === true;
}

export function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Truck, text: 'Loading the supplier book for this pharmacy…' };
    case 'empty':
      return {
        icon: Truck,
        text: 'No distributors on file yet. Add the first stockist this pharmacy buys from.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Code, legal name, contact, phone, and address are required before saving this supplier.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This till login cannot open the supplier book. Ask the owner to grant Purchases or Accounts.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That code or GSTIN is already on this pharmacy’s supplier book. Search and open the existing card.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for suppliers. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Supplier saved on this pharmacy’s book.' };
    default:
      return null;
  }
}

export function statusIconClass(status: PageStatus): string {
  if (status === 'success') {
    return 'text-brand';
  }
  if (status === 'conflict' || status === 'validation') {
    return 'text-warn';
  }
  if (status === 'failure' || status === 'denied') {
    return 'text-danger';
  }
  return 'text-brand';
}

export function typeLabel(type: SupplierType): string {
  switch (type) {
    case 'SUPER_STOCKIST':
      return 'Super stockist';
    case 'DISTRIBUTOR':
      return 'Distributor';
    case 'WHOLESALER':
      return 'Wholesaler';
    case 'MANUFACTURER':
      return 'Manufacturer';
    default:
      return type;
  }
}

export function statusLabel(status: SupplierStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'BLOCKED':
      return 'Blocked';
    default:
      return status;
  }
}

export function termsLabel(terms: SupplierPaymentTerms): string {
  switch (terms) {
    case 'COD':
      return 'Cash on delivery';
    case 'ADVANCE':
      return 'Advance';
    case 'CREDIT':
      return 'Credit';
    default:
      return terms;
  }
}

export function licenseStatusCopy(status: SupplierLicenseStatus): string {
  switch (status) {
    case 'MISSING':
      return 'No drug license on file';
    case 'VALID':
      return 'License current';
    case 'EXPIRING':
      return 'License due within 30 days';
    case 'EXPIRED':
      return 'License lapsed — renew before the next indent';
    default:
      return status;
  }
}

export function licenseTone(status: SupplierLicenseStatus): string {
  if (status === 'EXPIRED') {
    return 'text-danger';
  }
  if (status === 'EXPIRING' || status === 'MISSING') {
    return 'text-warn';
  }
  return 'text-brand';
}

export function formatPaise(paise: number | null): string {
  if (paise == null) {
    return '—';
  }
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function validateForm(form: FormState): boolean {
  return Boolean(
    form.supplierCode.trim() &&
    form.legalName.trim() &&
    form.contactPersonName.trim() &&
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

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toForm(supplier: Supplier): FormState {
  return {
    supplierCode: supplier.supplierCode,
    legalName: supplier.legalName,
    tradeName: supplier.tradeName ?? '',
    supplierType: supplier.supplierType,
    gstin: supplier.gstin ?? '',
    pan: supplier.pan ?? '',
    drugLicenseNumber: supplier.drugLicenseNumber ?? '',
    drugLicenseType: supplier.drugLicenseType ?? '',
    drugLicenseExpiry: supplier.drugLicenseExpiry ?? '',
    fssaiLicenseNumber: supplier.fssaiLicenseNumber ?? '',
    contactPersonName: supplier.contactPersonName,
    contactPersonRole: supplier.contactPersonRole ?? '',
    phone: supplier.phone,
    alternatePhone: supplier.alternatePhone ?? '',
    email: supplier.email ?? '',
    website: supplier.website ?? '',
    addressLine1: supplier.addressLine1,
    addressLine2: supplier.addressLine2 ?? '',
    city: supplier.city,
    state: supplier.state,
    pincode: supplier.pincode,
    country: supplier.country,
    paymentTerms: supplier.paymentTerms,
    creditPeriodDays: supplier.creditPeriodDays == null ? '' : String(supplier.creditPeriodDays),
    creditLimitRupees:
      supplier.creditLimitPaise == null ? '' : String(supplier.creditLimitPaise / 100),
    bankName: supplier.bankName ?? '',
    accountHolderName: supplier.accountHolderName ?? '',
    accountNumber: supplier.accountNumber ?? '',
    confirmAccountNumber: supplier.accountNumber ?? '',
    ifscCode: supplier.ifscCode ?? '',
    upiId: supplier.upiId ?? '',
    categoryIds: [...supplier.categoryIds],
    status: supplier.status,
    notes: supplier.notes ?? '',
  };
}

export function toInput(form: FormState): SupplierInput {
  const rupees = optionalNumber(form.creditLimitRupees);
  return {
    supplierCode: form.supplierCode.trim(),
    legalName: form.legalName.trim(),
    tradeName: optional(form.tradeName),
    supplierType: form.supplierType,
    gstin: optional(form.gstin),
    pan: optional(form.pan),
    drugLicenseNumber: optional(form.drugLicenseNumber),
    drugLicenseType: form.drugLicenseType || null,
    drugLicenseExpiry: optional(form.drugLicenseExpiry),
    fssaiLicenseNumber: optional(form.fssaiLicenseNumber),
    contactPersonName: form.contactPersonName.trim(),
    contactPersonRole: optional(form.contactPersonRole),
    phone: form.phone.trim(),
    alternatePhone: optional(form.alternatePhone),
    email: optional(form.email),
    website: optional(form.website),
    addressLine1: form.addressLine1.trim(),
    addressLine2: optional(form.addressLine2),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    country: optional(form.country) ?? 'India',
    paymentTerms: form.paymentTerms,
    creditPeriodDays: optionalNumber(form.creditPeriodDays),
    creditLimitPaise: rupees == null ? undefined : Math.round(rupees * 100),
    bankName: optional(form.bankName),
    accountHolderName: optional(form.accountHolderName),
    accountNumber: optional(form.accountNumber),
    confirmAccountNumber: optional(form.confirmAccountNumber),
    ifscCode: optional(form.ifscCode),
    upiId: optional(form.upiId),
    categoryIds: form.categoryIds,
    status: form.status,
    notes: optional(form.notes),
  };
}

export function categoryNames(ids: string[], categories: ProductCategory[]): string {
  if (ids.length === 0) {
    return 'No lines tagged';
  }
  const names = ids
    .map((id) => categories.find((row) => row.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length ? names.join(', ') : `${ids.length} lines`;
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'CODE_TAKEN' || error.code === 'GSTIN_TAKEN') {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'LICENSE_DATE_INVALID' ||
    error.code === 'UNSAFE_BANK_UPDATE'
  ) {
    return 'validation';
  }
  return 'failure';
}
