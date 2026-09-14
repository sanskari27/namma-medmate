import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type { AgingParty } from '@/services/aging';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type OutletScope = 'session' | 'tenant';

export type AgingBook = 'receivables' | 'payables';

export type PeriodKind = 'today' | 'month' | 'custom';

export type AgingBucketKey = 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';

export const BUCKET_LABELS: Record<AgingBucketKey, string> = {
  D0_30: '0–30',
  D31_60: '31–60',
  D61_90: '61–90',
  D90_PLUS: '90+',
};

export { hasFinanceAccess } from '@/libs/financeAccess';

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function currentMonth(): string {
  return todayIst().slice(0, 7);
}

export function isFutureAsOf(asOf: string, today = todayIst()): boolean {
  return Boolean(asOf) && asOf > today;
}

export function monthAsOf(month: string, today = todayIst()): string {
  const [year, mo] = month.split('-').map(Number);
  if (!year || !mo) {
    return today;
  }
  const last = new Date(year, mo, 0);
  const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(last);
  return asOf > today ? today : asOf;
}

export function resolveAsOf(kind: PeriodKind, month: string, custom: string): string {
  if (kind === 'today') {
    return todayIst();
  }
  if (kind === 'month') {
    return monthAsOf(month);
  }
  return custom || todayIst();
}

export function periodLabel(kind: PeriodKind, month: string, asOf: string): string {
  if (kind === 'today') {
    return formatLongDate(asOf);
  }
  if (kind === 'month') {
    return formatMonth(month);
  }
  return formatLongDate(asOf);
}

export function formatMonth(month: string): string {
  const [year, mo] = month.split('-').map(Number);
  if (!year || !mo) {
    return month;
  }
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(year, mo - 1, 1),
  );
}

export function formatLongDate(value: string): string {
  const date = value.length === 10 ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function bucketForDays(days: number): AgingBucketKey {
  if (days <= 30) {
    return 'D0_30';
  }
  if (days <= 60) {
    return 'D31_60';
  }
  if (days <= 90) {
    return 'D61_90';
  }
  return 'D90_PLUS';
}

export function bucketLabel(key: string, fallback: string): string {
  if (key === 'D0_30' || key === 'D31_60' || key === 'D61_90' || key === 'D90_PLUS') {
    return BUCKET_LABELS[key];
  }
  return fallback;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
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

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((cols) =>
      cols
        .map((cell) => {
          const value = cell ?? '';
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printReport(title: string, tableHtml: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) {
    return;
  }
  win.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#1d2a1c}
      h1{font-size:18px;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #d7e4db;padding:8px;text-align:left}
      th{background:#e9f3ee;text-transform:uppercase;font-size:11px}
    </style></head><body>
    <h1>${title}</h1>${tableHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function csvRows(items: AgingParty[]): string[][] {
  return [
    ['Party', 'Outstanding', 'Age (days)', 'Bucket'],
    ...items.map((row) => [
      row.name,
      formatPaise(row.amountPaise),
      String(row.days),
      BUCKET_LABELS[bucketForDays(row.days)],
    ]),
  ];
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
  if (error.code === 'PLAN_LIMIT' || error.status === 403 || error.code === 'FORBIDDEN') {
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
  if (code === 'PLAN_LIMIT') {
    return 'Khata and stockist aging is on Growth. Open the plan to turn it on.';
  }
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
