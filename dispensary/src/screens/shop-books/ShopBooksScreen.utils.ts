import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type { FinanceReportCatalogItem } from '@/services/financeReports';
import type { FilterChipId } from './ShopBooksScreen.content';

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

export type PeriodKind = 'today' | 'month' | 'year' | 'fy' | 'custom' | 'all';

export type PeriodSpan = 'single' | 'range';

export type ReportGroup = 'favourite' | 'gst' | 'transaction';

export type ReportMeta = {
  group: Exclude<ReportGroup, 'favourite'>;
  favourite?: boolean;
  tags: FilterChipId[];
  catalogTitle: string;
  hint: string;
};

export const REPORT_META: Record<string, ReportMeta> = {
  PROFIT_AND_LOSS: {
    group: 'transaction',
    favourite: true,
    tags: ['summary'],
    catalogTitle: 'Profit And Loss Report',
    hint: 'Revenue, spend and profit for the period',
  },
  GSTR1: {
    group: 'gst',
    favourite: true,
    tags: ['invoice'],
    catalogTitle: 'GSTR-1 (Sales)',
    hint: 'Outward supplies for the CA',
  },
  SALES_SUMMARY: {
    group: 'transaction',
    favourite: true,
    tags: ['summary'],
    catalogTitle: 'Sales Summary',
    hint: 'Billed sales in this period',
  },
  GSTR3B: {
    group: 'gst',
    tags: ['summary'],
    catalogTitle: 'GSTR-3b',
    hint: 'GST payable summary',
  },
  DAY_BOOK: {
    group: 'transaction',
    tags: ['summary'],
    catalogTitle: 'Daybook',
    hint: 'Net sales vs purchases per day',
  },
  EXPENSE_SUMMARY: {
    group: 'transaction',
    tags: ['category'],
    catalogTitle: 'Expense Category Report',
    hint: 'Shop spend grouped by head',
  },
  PURCHASE_SUMMARY: {
    group: 'transaction',
    tags: ['summary'],
    catalogTitle: 'Purchase Summary',
    hint: 'Stockist buys in this period',
  },
  BRANCH_PNL: {
    group: 'transaction',
    tags: ['summary'],
    catalogTitle: 'Outlet-wise Profit And Loss',
    hint: 'P&L split by outlet',
  },
};

export { hasFinanceAccess } from '@/libs/financeAccess';

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function currentMonth(): string {
  return todayIst().slice(0, 7);
}

export function currentYear(): string {
  return todayIst().slice(0, 4);
}

export function capToToday(value: string, today = todayIst()): string {
  return value > today ? today : value;
}

export function monthEnd(month: string): string {
  const [year, mo] = month.split('-').map(Number);
  if (!year || !mo) {
    return todayIst();
  }
  return capToToday(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(year, mo, 0)),
  );
}

export function fyRange(today = todayIst()): { from: string; to: string } {
  const [year, month] = today.split('-').map(Number);
  const startYear = month >= 4 ? year : year - 1;
  return {
    from: `${startYear}-04-01`,
    to: capToToday(`${startYear + 1}-03-31`, today),
  };
}

export type PeriodState = {
  kind: PeriodKind;
  span: PeriodSpan;
  month: string;
  monthTo: string;
  year: string;
  customFrom: string;
  customTo: string;
};

export function defaultPeriod(): PeriodState {
  const month = currentMonth();
  return {
    kind: 'month',
    span: 'single',
    month,
    monthTo: month,
    year: currentYear(),
    customFrom: todayIst(),
    customTo: todayIst(),
  };
}

export function resolveRange(period: PeriodState): { from?: string; to?: string } {
  const today = todayIst();
  if (period.kind === 'all') {
    const start = new Date(`${today}T12:00:00+05:30`);
    start.setDate(start.getDate() - 365);
    return {
      from: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(start),
      to: today,
    };
  }
  if (period.kind === 'today') {
    return { from: today, to: today };
  }
  if (period.kind === 'fy') {
    return fyRange(today);
  }
  if (period.kind === 'year') {
    const year = period.year || currentYear();
    return { from: `${year}-01-01`, to: capToToday(`${year}-12-31`) };
  }
  if (period.kind === 'custom' || period.span === 'range') {
    if (period.kind === 'month' && period.span === 'range') {
      return { from: `${period.month}-01`, to: monthEnd(period.monthTo || period.month) };
    }
    return {
      from: period.customFrom || today,
      to: capToToday(period.customTo || today),
    };
  }
  return { from: `${period.month}-01`, to: monthEnd(period.month) };
}

export function periodLabel(period: PeriodState): string {
  if (period.kind === 'today') {
    return 'Today';
  }
  if (period.kind === 'all') {
    return 'All time';
  }
  if (period.kind === 'fy') {
    const { from } = fyRange();
    const startYear = from.slice(0, 4);
    return `FY ${startYear}-${String(Number(startYear) + 1).slice(2)}`;
  }
  if (period.kind === 'year') {
    return period.year;
  }
  if (period.kind === 'custom') {
    return `${period.customFrom} – ${period.customTo}`;
  }
  return formatMonth(period.month);
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

export function rangeValid(from?: string, to?: string): boolean {
  if (!from || !to) {
    return true;
  }
  return from <= to;
}

export function isFutureRange(to?: string, today = todayIst()): boolean {
  return Boolean(to) && to > today;
}

export function filenameFor(key: string, format: 'csv' | 'pdf'): string {
  return `${key.toLowerCase().replace(/_/g, '-')}-shop-book.${format}`;
}

export function bookEntitled(book: { entitled?: boolean } | null | undefined): boolean {
  return book?.entitled !== false;
}

export function firstEntitledKey(books: Array<{ key: string; entitled?: boolean }>): string | null {
  return books.find((book) => bookEntitled(book))?.key ?? books[0]?.key ?? null;
}

export function planLabel(minPlan?: string): string | null {
  if (minPlan === 'STARTER') {
    return 'On Starter';
  }
  if (minPlan === 'GROWTH' || minPlan === 'PRO') {
    return 'On Growth';
  }
  return null;
}

export function catalogTitle(key: string, fallback: string): string {
  return REPORT_META[key]?.catalogTitle ?? shopBookTitle(key, fallback);
}

export function catalogHint(key: string): string {
  return REPORT_META[key]?.hint ?? 'Shop book for this outlet';
}

export function shopBookTitle(key: string, fallback: string): string {
  return catalogTitle(key, fallback);
}

export function groupedCatalog(
  books: FinanceReportCatalogItem[],
  search: string,
  chip: FilterChipId | null,
): Record<ReportGroup, FinanceReportCatalogItem[]> {
  const q = search.trim().toLowerCase();
  const match = (book: FinanceReportCatalogItem) => {
    const meta = REPORT_META[book.key];
    const title = catalogTitle(book.key, book.title).toLowerCase();
    if (q && !title.includes(q) && !book.key.toLowerCase().includes(q)) {
      return false;
    }
    if (chip && !(meta?.tags.includes(chip) ?? false)) {
      return false;
    }
    return true;
  };
  const visible = books.filter(match);
  return {
    favourite: visible.filter((book) => REPORT_META[book.key]?.favourite),
    gst: visible.filter((book) => REPORT_META[book.key]?.group === 'gst'),
    transaction: visible.filter((book) => (REPORT_META[book.key]?.group ?? 'transaction') === 'transaction'),
  };
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
    minimumFractionDigits: 0,
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

export function numericColumn(column: string): boolean {
  return column.endsWith('Paise') || column === 'days';
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
    return 'This shop book is on Growth. Open the plan to turn it on.';
  }
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
