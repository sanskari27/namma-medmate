import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

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

export type FilterState = {
  from: string;
  to: string;
};

export const emptyFilters = (): FilterState => ({
  from: '',
  to: '',
});

export function hasFinanceAccess(role: string | undefined, modules: string[] | undefined): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return modules?.includes('FINANCE') === true;
}

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function filtersValid(filters: FilterState): boolean {
  if (!filters.from || !filters.to) {
    return true;
  }
  return filters.from <= filters.to;
}

export function isFutureRange(filters: FilterState, today = todayIst()): boolean {
  return Boolean(filters.to) && filters.to > today;
}

export function toQuery(
  filters: FilterState,
  scope: OutletScope,
): { from?: string; to?: string; scope?: string } {
  const query: { from?: string; to?: string; scope?: string } = {};
  if (filters.from) {
    query.from = filters.from;
  }
  if (filters.to) {
    query.to = filters.to;
  }
  if (scope === 'tenant') {
    query.scope = 'tenant';
  }
  return query;
}

export function filenameFor(key: string, format: 'csv' | 'pdf'): string {
  return `${key.toLowerCase().replace(/_/g, '-')}-shop-book.${format}`;
}

export function shopBookTitle(key: string, fallback: string): string {
  switch (key) {
    case 'DAY_BOOK':
      return 'Day book';
    case 'SALES_SUMMARY':
      return 'Sales';
    case 'PURCHASE_SUMMARY':
      return 'Stockist buys';
    case 'EXPENSE_SUMMARY':
      return 'Shop spend';
    case 'PROFIT_AND_LOSS':
      return 'Shop P&L';
    case 'GSTR1':
      return 'GST for the CA (GSTR-1)';
    case 'GSTR3B':
      return 'GST for the CA (GSTR-3B)';
    case 'BRANCH_PNL':
      return 'Outlet P&L';
    default:
      return fallback;
  }
}

export function columnLabel(column: string): string {
  switch (column) {
    case 'occurredIst':
    case 'dateIst':
      return 'When (IST)';
    case 'kind':
      return 'Kind';
    case 'reference':
      return 'Ref';
    case 'amountPaise':
      return 'Amount';
    case 'invoiceNumber':
      return 'Bill no.';
    case 'walkIn':
      return 'Walk-in';
    case 'taxablePaise':
      return 'Taxable';
    case 'cgstPaise':
      return 'CGST';
    case 'sgstPaise':
      return 'SGST';
    case 'igstPaise':
      return 'IGST';
    case 'totalPaise':
      return 'Total';
    case 'supplier':
      return 'Stockist';
    case 'invoicesPaise':
      return 'Invoices';
    case 'debitNotesPaise':
      return 'Debit notes';
    case 'netPaise':
      return 'Net';
    case 'category':
      return 'Spend head';
    case 'line':
      return 'Line';
    case 'section':
      return 'GST section';
    case 'gstin':
      return 'GSTIN';
    case 'hsn':
      return 'HSN';
    case 'branchName':
      return 'Outlet';
    case 'revenuePaise':
      return 'Revenue';
    case 'cogsPaise':
      return 'COGS';
    case 'expensesPaise':
      return 'Spend';
    case 'profitPaise':
      return 'Profit';
    case 'outwardTaxablePaise':
      return 'Outward taxable';
    case 'itcPaise':
      return 'ITC';
    case 'payablePaise':
      return 'Payable';
    default:
      return column.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase());
  }
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function cellValue(column: string, value: string | undefined): string {
  if (value == null || value === '') {
    return '';
  }
  if (column.endsWith('Paise') && /^-?\d+$/.test(value)) {
    return formatPaise(Number(value));
  }
  return value;
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading shop books…';
    case 'empty':
      return 'No rows in this shop book yet. Complete a sale or post spend and it lands here.';
    case 'validation':
      return 'Choose a period that starts on or before the end date.';
    case 'denied':
      return 'Till staff cannot open shop books. Ask the owner for Accounts access.';
    case 'conflict':
      return 'This book changed on another till. Reload, then take the sheet again.';
    case 'failure':
      return 'Could not load shop books. Check the connection and try again.';
    case 'success':
      return 'Shop book ready for this outlet.';
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
    return 'Report dates must be today or earlier.';
  }
  if (code === 'RANGE_UNSUPPORTED') {
    return 'Use a date range of 366 days or less, with from before to.';
  }
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before opening shop books.';
  }
  if (code === 'EXPORT_TOO_LARGE') {
    return 'Narrow the date range. This shop book is too large to export in one file.';
  }
  if (code === 'STALE_STATE') {
    return 'This book changed on another till. Reload, then take the sheet again.';
  }
  return null;
}
