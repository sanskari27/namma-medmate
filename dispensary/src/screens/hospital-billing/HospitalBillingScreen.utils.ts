import type { HospitalCreditTerms } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from './HospitalBillingScreen.content';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'pending_approval'
  | 'plan_limit'
  | null;

export type SaveTarget =
  | 'account'
  | 'prices'
  | 'return'
  | 'payment'
  | 'reminder'
  | 'stock'
  | 'statement'
  | null;

export type BillingView = 'account' | 'stock' | 'statement';

export function parseBillingView(raw: string | null): BillingView {
  if (raw === 'stock' || raw === 'statement') {
    return raw;
  }
  return 'account';
}

export const CREDIT_TERMS: HospitalCreditTerms[] = [
  'ON_DEMAND',
  'NET_15',
  'NET_30',
  'NET_45',
];

export function creditTermsLabel(terms: HospitalCreditTerms): string {
  switch (terms) {
    case 'ON_DEMAND':
      return 'On demand';
    case 'NET_15':
      return 'Net 15';
    case 'NET_30':
      return 'Net 30';
    case 'NET_45':
      return 'Net 45';
    default:
      return terms;
  }
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2).replace(/\.?0+$/, '');
}

export function percentToBps(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return Math.round(value * 100);
}

export function parseRupeesInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '');
  if (!trimmed) {
    return 0;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatIstDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatQty(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity);
}

export const PAYMENT_MODES = ['CASH', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CARD'] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export function canOpenHospitalStatement(user: {
  role: string;
  roles?: { code: string | null }[];
} | null | undefined): boolean {
  if (!user) {
    return false;
  }
  if (user.role === 'pharmacy_owner') {
    return true;
  }
  return user.roles?.some((role) => role.code === 'accountant') === true;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function billingAlertCopy(
  status: PageStatus,
  saveTarget: SaveTarget,
  errorCode: string | null,
): string | null {
  if (status === 'validation') {
    if (errorCode === 'OVER_RETURN') {
      return HOSPITAL_BILLING_CONTENT.overReturn;
    }
    if (errorCode === 'OVERPAYMENT') {
      return HOSPITAL_BILLING_CONTENT.overpayment;
    }
    if (errorCode === 'NOTHING_DUE') {
      return HOSPITAL_BILLING_CONTENT.nothingDue;
    }
    if (saveTarget === 'prices') {
      return HOSPITAL_BILLING_CONTENT.validationPrices;
    }
    if (saveTarget === 'return') {
      return HOSPITAL_BILLING_CONTENT.validationReturn;
    }
    if (saveTarget === 'payment') {
      return HOSPITAL_BILLING_CONTENT.validationPayment;
    }
    return HOSPITAL_BILLING_CONTENT.validationAccount;
  }
  if (status === 'conflict') {
    return HOSPITAL_BILLING_CONTENT.conflict;
  }
  if (status === 'failure') {
    return HOSPITAL_BILLING_CONTENT.loadFailed;
  }
  return null;
}

export function mapHttpStatus(status: number, code: string | null): PageStatus {
  if (status === 403) {
    return 'denied';
  }
  if (status === 409) {
    return 'conflict';
  }
  if (status === 422 && code === 'PLAN_LIMIT') {
    return 'plan_limit';
  }
  if (status === 422 && code === 'OVER_RETURN') {
    return 'validation';
  }
  if (status === 422 && code === 'OVERPAYMENT') {
    return 'validation';
  }
  if (status === 422 && code === 'NOTHING_DUE') {
    return 'validation';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  return 'failure';
}
