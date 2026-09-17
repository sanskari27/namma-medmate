import type {
  CreditDirectorySummary,
  OutstandingCreditAccount,
} from '@/services/credit';
import { ROUTES } from '@/libs/constants/routes.const';
import { CREDIT_CONTENT } from './CreditScreen.content';

export type CreditPageStatus = 'idle' | 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
export type CreditTab = 'outstanding' | 'payments';
export type CreditSort = 'amount' | 'oldest';
export type CreditAgingFilter = 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS' | null;

export function hasCrmAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('CRM'));
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function formatAge(days: number): string {
  if (days <= 0) return '0d';
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const rem = days % 30;
    return rem === 0 ? `${months}mo` : `${months}mo ${rem}d`;
  }
  return `${Math.floor(days / 365)}y`;
}

export function formatIstDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function modeLabel(mode: string | null | undefined): string {
  if (!mode) return '—';
  return mode
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function agingBucketKey(ageDays: number): Exclude<CreditAgingFilter, null> {
  if (ageDays <= 30) return 'D0_30';
  if (ageDays <= 60) return 'D31_60';
  if (ageDays <= 90) return 'D61_90';
  return 'D90_PLUS';
}

export function filterOutstanding(
  items: OutstandingCreditAccount[],
  query: string,
  overdueOnly: boolean,
  agingFilter: CreditAgingFilter,
  sort: CreditSort,
): OutstandingCreditAccount[] {
  const q = query.trim().toLowerCase();
  let rows = items.filter((row) => {
    if (overdueOnly && row.ageDays <= 30) return false;
    if (agingFilter && agingBucketKey(row.ageDays) !== agingFilter) return false;
    if (!q) return true;
    return (
      row.customerName.toLowerCase().includes(q) ||
      row.customerPhone.toLowerCase().includes(q)
    );
  });
  rows = [...rows].sort((a, b) => {
    if (sort === 'oldest') return b.ageDays - a.ageDays || b.balancePaise - a.balancePaise;
    return b.balancePaise - a.balancePaise || b.ageDays - a.ageDays;
  });
  return rows;
}

export function averageOutstanding(summary: CreditDirectorySummary): string {
  if (summary.outstandingAccountCount <= 0) return formatPaise(0);
  return formatPaise(
    Math.round(summary.totalOutstandingPaise / summary.outstandingAccountCount),
  );
}

export function whatsappHref(phone: string | null | undefined, amountPaise: number): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Reminder from your pharmacy: outstanding khata balance is ${formatPaise(amountPaise)}.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export function newCreditSaleHref(customerId?: string): string {
  if (customerId) {
    return `${ROUTES.SALES}?customer=${encodeURIComponent(customerId)}`;
  }
  return ROUTES.SALES;
}

export function statusCopy(status: CreditPageStatus): string | null {
  switch (status) {
    case 'loading':
      return CREDIT_CONTENT.status.loading;
    case 'empty':
      return CREDIT_CONTENT.emptyOutstanding;
    case 'denied':
      return CREDIT_CONTENT.denied;
    case 'failure':
      return CREDIT_CONTENT.status.failure;
    case 'success':
      return CREDIT_CONTENT.status.success;
    default:
      return null;
  }
}

export function emptySummary(): CreditDirectorySummary {
  return {
    totalOutstandingPaise: 0,
    outstandingAccountCount: 0,
    overduePaise: 0,
    overdueAccountCount: 0,
    collectedThisMonthPaise: 0,
    collectionRatePercent: 0,
    creditGivenAllTimePaise: 0,
    khataAccountCount: 0,
  };
}
