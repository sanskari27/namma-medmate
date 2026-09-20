import type { HospitalCreditTerms } from '@/services/hospital';

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

export type SaveTarget = 'account' | 'prices' | null;

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
  if (status === 400 || status === 422) {
    return 'validation';
  }
  return 'failure';
}
