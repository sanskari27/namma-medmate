import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FilterState = {
  from: string;
  to: string;
  batchNumber: string;
};

export const emptyFilters = (): FilterState => ({
  from: '',
  to: '',
  batchNumber: '',
});

export function bookEntitled(book: { entitled?: boolean } | null | undefined): boolean {
  return book?.entitled !== false;
}

export function firstEntitledKey(
  books: Array<{ key: string; entitled?: boolean }>,
): string | null {
  return books.find((book) => bookEntitled(book))?.key ?? books[0]?.key ?? null;
}

export function hasRegisterAccess(modules: string[] | undefined): boolean {
  return modules?.includes('COMPLIANCE') === true;
}

export function filtersValid(filters: FilterState): boolean {
  if (!filters.from || !filters.to) {
    return true;
  }
  return filters.from <= filters.to;
}

export function toQuery(filters: FilterState): {
  from?: string;
  to?: string;
  batchNumber?: string;
} {
  const query: { from?: string; to?: string; batchNumber?: string } = {};
  if (filters.from) {
    query.from = `${filters.from}T00:00:00.000Z`;
  }
  if (filters.to) {
    query.to = `${filters.to}T23:59:59.000Z`;
  }
  if (filters.batchNumber.trim()) {
    query.batchNumber = filters.batchNumber.trim();
  }
  return query;
}

export function filenameFor(key: string, format: 'csv' | 'pdf'): string {
  return `${key.toLowerCase().replace(/_/g, '-')}-register.${format}`;
}

export function columnLabel(column: string): string {
  switch (column) {
    case 'dateIst':
      return 'When (IST)';
    case 'invoiceNumber':
      return 'Bill no.';
    case 'productName':
      return 'Pack';
    case 'sku':
      return 'SKU';
    case 'batchNumber':
      return 'Batch';
    case 'quantity':
      return 'Qty';
    case 'patientName':
      return 'Patient';
    case 'prescriptionReference':
      return 'Rx';
    case 'licenseNumber':
      return 'Licence no.';
    default:
      return column.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase());
  }
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading this outlet register book…';
    case 'empty':
      return 'No rows in this book for this outlet yet. Complete a sale, delivery, or stock count and it lands here.';
    case 'validation':
      return 'Choose a period that starts on or before the end date.';
    case 'denied':
      return 'Ask the owner to grant Register book on your floor role before opening these books.';
    case 'conflict':
      return 'This book changed on another till. Reload, then take the sheet again.';
    case 'failure':
      return 'Could not load the register book. Check the connection and try again.';
    case 'success':
      return 'Register book ready for this outlet.';
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
    return 'Near-expiry is on Starter. Open the plan to turn it on.';
  }
  if (code === 'STALE_STATE') {
    return 'This book changed on another till. Reload, then take the sheet again.';
  }
  return null;
}
