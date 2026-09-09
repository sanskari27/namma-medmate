import type { SalesInvoice } from '@/services/salesInvoices';
import type { SalesReturnRefundMode, SalesReturnSummary } from '@/services/salesReturns';
import { RETURNS_CONTENT } from './ReturnsScreen.content';

export type ReturnsFilter = 'all' | 'cash' | 'credit';

export type ReturnsFilterCounts = Record<ReturnsFilter, number>;

export type LineDraft = Record<string, string>;

export type ReturnsPageStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'denied'
  | 'no_branch';

export type CreateStatus =
  | null
  | 'validation'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'finding'
  | 'previewing'
  | 'recording';

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
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

export function refundModeLabel(mode: SalesReturnRefundMode): string {
  return RETURNS_CONTENT.refund[mode];
}

export function refundTone(mode: SalesReturnRefundMode): 'green' | 'gold' {
  return mode === 'CASH' ? 'green' : 'gold';
}

export function unitsLabel(row: SalesReturnSummary): string {
  return RETURNS_CONTENT.units(row.itemUnitCount);
}

export function customerMeta(row: SalesReturnSummary): string {
  const bits = [relativeTime(row.createdAt)];
  if (row.customerPhone) bits.push(row.customerPhone);
  return bits.filter(Boolean).join(' · ');
}

export function matchesFilter(row: SalesReturnSummary, filter: ReturnsFilter): boolean {
  if (filter === 'cash') return row.refundMode === 'CASH';
  if (filter === 'credit') return row.refundMode === 'CREDIT_NOTE';
  return true;
}

export function matchesQuery(row: SalesReturnSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.invoiceNumber,
    row.customerName,
    row.customerPhone ?? '',
    row.reason,
    row.itemSummary,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterCounts(items: SalesReturnSummary[]): ReturnsFilterCounts {
  return {
    all: items.length,
    cash: items.filter((row) => row.refundMode === 'CASH').length,
    credit: items.filter((row) => row.refundMode === 'CREDIT_NOTE').length,
  };
}

export function filteredReturns(
  items: SalesReturnSummary[],
  filter: ReturnsFilter,
  query: string,
): SalesReturnSummary[] {
  return items.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query));
}

export function summaryStats(items: SalesReturnSummary[]) {
  return {
    count: items.length,
    units: items.reduce((sum, row) => sum + row.itemUnitCount, 0),
    cashPaise: items.reduce((sum, row) => sum + row.cashRefundPaise, 0),
    creditPaise: items.reduce((sum, row) => sum + row.creditNotePaise, 0),
    totalPaise: items.reduce((sum, row) => sum + row.refundTotalPaise, 0),
  };
}

export function lineQuantity(value: number | string): number {
  return Number(value);
}

export function selectedReturnLines(invoice: SalesInvoice, qtyByLine: LineDraft) {
  return invoice.lines
    .map((line) => ({
      salesInvoiceLineId: line.id,
      quantity: Number(qtyByLine[line.id] ?? 0),
    }))
    .filter((line) => line.quantity > 0);
}

export function matchCompletedInvoice(
  invoices: SalesInvoice[],
  query: string,
): SalesInvoice | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return invoices.find(
    (row) =>
      row.status === 'COMPLETED' &&
      (row.invoiceNumber.toLowerCase() === needle || row.id.toLowerCase() === needle),
  );
}

export function mapCreateError(error: {
  status: number;
  code: string | null;
}): CreateStatus {
  if (
    error.status === 409 ||
    error.code === 'STALE_STATE' ||
    error.code === 'IDEMPOTENCY_CONFLICT'
  ) {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'OVER_RETURN' ||
    error.code === 'NOT_RETURNABLE' ||
    error.code === 'BATCH_EXPIRED' ||
    error.code === 'CREDIT_NOTE_CUSTOMER_REQUIRED'
  ) {
    return 'validation';
  }
  return 'failure';
}

/** @deprecated Prefer mapCreateError — kept for existing util tests. */
export function mapApiStatus(error: {
  status: number;
  code: string | null;
}): CreateStatus {
  return mapCreateError(error);
}

export function apiStatusHint(code: string | null): string | null {
  switch (code) {
    case 'OVER_RETURN':
      return 'Cannot take back more than what is still sold on this bill.';
    case 'NOT_RETURNABLE':
      return 'This medicine is marked not returnable. Leave it on the bill.';
    case 'BATCH_EXPIRED':
      return 'That batch has expired and cannot go back on the floor.';
    case 'CREDIT_NOTE_CUSTOMER_REQUIRED':
      return 'A credit note needs the khata customer from the original bill. Use cash, or pick a billed patient.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This return request was already used with a different qty or refund.';
    default:
      return null;
  }
}

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}
