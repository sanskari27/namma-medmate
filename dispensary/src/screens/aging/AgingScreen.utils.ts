import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type OutletScope = 'session' | 'tenant';

export type AgingBucketKey = 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';

export const BUCKET_LABELS: Record<AgingBucketKey, string> = {
  D0_30: '0–30 days',
  D31_60: '31–60 days',
  D61_90: '61–90 days',
  D90_PLUS: '90+ days',
};

export { hasFinanceAccess } from '@/libs/financeAccess';

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function isFutureAsOf(asOf: string, today = todayIst()): boolean {
  return Boolean(asOf) && asOf > today;
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading khata and stockist dues…';
    case 'empty':
      return 'No dues as of this date. Khata and stockist books are clear.';
    case 'validation':
      return 'As-of date must be today or earlier.';
    case 'denied':
      return 'Till staff cannot open dues. Ask the owner for Accounts access.';
    case 'conflict':
      return 'These figures changed on another till. Reload, then apply the date again.';
    case 'failure':
      return 'Could not load dues. Check the connection and try again.';
    case 'success':
      return 'Dues as of this date, from khata and stockist books.';
    default:
      return null;
  }
}

export function statusIcon(status: PageStatus) {
  if (status === 'success') {
    return CheckCircle2;
  }
  if (status === 'failure' || status === 'conflict') {
    return WifiOff;
  }
  return AlertCircle;
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'FUTURE_AS_OF') {
    return 'As-of date must be today or earlier.';
  }
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before opening dues.';
  }
  if (code === 'STALE_STATE') {
    return 'These figures changed on another till. Reload, then apply the date again.';
  }
  return null;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatAgeOn(value: string): string {
  if (!value) {
    return '—';
  }
  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function bucketLabel(key: string, fallback: string): string {
  if (key === 'D0_30' || key === 'D31_60' || key === 'D61_90' || key === 'D90_PLUS') {
    return BUCKET_LABELS[key];
  }
  return fallback;
}
