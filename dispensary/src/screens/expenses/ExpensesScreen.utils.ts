import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type { ExpensePaymentMode, ShopExpense } from '@/services/expenses';

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

export type ReportMode = 'transactions' | 'category';

export type PeriodKey = '7d' | '30d' | '90d' | '365d' | 'month' | 'all';

export type FormState = {
  categoryId: string;
  amountRupees: string;
  occurredOn: string;
  notes: string;
  partyName: string;
  paymentMode: ExpensePaymentMode;
  gstPercent: number;
};

export const GST_OPTIONS = [0, 5, 12, 18, 28] as const;

export const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: '365d', label: 'Last 365 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export const PAYMENT_OPTIONS: Array<{ value: ExpensePaymentMode; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'COD', label: 'Cash on Delivery' },
];

export { hasFinanceAccess } from '@/libs/financeAccess';

export function emptyForm(today = isoTodayIst()): FormState {
  return {
    categoryId: '',
    amountRupees: '',
    occurredOn: today,
    notes: '',
    partyName: '',
    paymentMode: 'CASH',
    gstPercent: 0,
  };
}

export function formFromExpense(row: ShopExpense): FormState {
  return {
    categoryId: row.categoryId,
    amountRupees: (row.amountPaise / 100).toFixed(2),
    occurredOn: row.occurredOn,
    notes: row.notes ?? '',
    partyName: row.partyName ?? '',
    paymentMode: row.paymentMode ?? 'CASH',
    gstPercent: row.gstPercent ?? 0,
  };
}

export function isoTodayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function periodRange(period: PeriodKey): { from?: string; to?: string; label: string } {
  const label = PERIOD_OPTIONS.find((row) => row.key === period)?.label ?? 'Period';
  if (period === 'all') {
    return { label };
  }
  const to = isoTodayIst();
  const end = new Date(`${to}T12:00:00+05:30`);
  if (period === 'month') {
    const from = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`;
    return { from, to, label };
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const from = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(start);
  return { from, to, label };
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading expenses…';
    case 'empty':
      return 'No expenses in this period. Create the first one.';
    case 'validation':
      return 'Category, amount, and date are required before saving.';
    case 'denied':
      return 'Till staff cannot open shop books. Ask the owner for Accounts access.';
    case 'conflict':
      return 'This expense was updated on another till. Reload, then save again.';
    case 'failure':
      return 'Could not load expenses. Check the connection and try again.';
    case 'success':
      return 'Expense saved.';
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
  if (code === 'INVALID_AMOUNT') {
    return 'Amount must be more than zero.';
  }
  if (code === 'INVALID_DATE') {
    return 'Date must be today or earlier.';
  }
  if (code === 'INVALID_CATEGORY') {
    return 'Pick a category from the list.';
  }
  if (code === 'CATEGORY_TAKEN') {
    return 'That category is already on the books.';
  }
  if (code === 'STALE_STATE') {
    return 'This expense was updated on another till. Reload, then save again.';
  }
  return null;
}

export function rupeesToPaise(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const [rupees, fraction = ''] = cleaned.split('.');
  const paise =
    Number.parseInt(rupees, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0') || '0', 10);
  return Number.isFinite(paise) ? paise : null;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formValid(form: FormState): boolean {
  return Boolean(form.categoryId && rupeesToPaise(form.amountRupees) && form.occurredOn);
}

export function formatExpenseWhen(occurredOn: string, createdAt?: string): string {
  const source = createdAt || (occurredOn.length === 10 ? `${occurredOn}T00:00:00Z` : occurredOn);
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return occurredOn || '—';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
    .format(date)
    .replace(',', '');
}

export function paymentLabel(mode: ExpensePaymentMode | string | null | undefined): string {
  const found = PAYMENT_OPTIONS.find((row) => row.value === mode);
  return found?.label ?? mode ?? '—';
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

export function printExpenseReport(title: string, tableHtml: string): void {
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
