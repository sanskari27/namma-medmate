import type { Product } from '@/services/products';
import type { GoodsReceiptQcStatus, GoodsReceiptSummary } from '@/services/goodsReceipts';
import type { ApiError } from '@/services/axios';

export type PageStatus =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'no_branch'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type CreateStatus =
  | null
  | 'validation'
  | 'saving'
  | 'success'
  | 'failure'
  | 'conflict'
  | 'denied';

export type EntryLine = {
  key: string;
  productId: string;
  quantity: string;
  freeQuantity: string;
  rateRupees: string;
};

export type EntryDraft = {
  supplierId: string;
  invoiceNo: string;
  invoiceDate: string;
  lines: EntryLine[];
};

export function hasPurchaseAccess(modules: string[] | undefined): boolean {
  return modules?.includes('PROCUREMENT') === true;
}

export function emptyEntryLine(key = crypto.randomUUID()): EntryLine {
  return {
    key,
    productId: '',
    quantity: '',
    freeQuantity: '',
    rateRupees: '',
  };
}

export function emptyEntryDraft(): EntryDraft {
  return {
    supplierId: '',
    invoiceNo: '',
    invoiceDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    lines: [emptyEntryLine()],
  };
}

export function formatPaise(paise: number | null | undefined): string {
  const value = Number(paise);
  if (!Number.isFinite(value)) return '₹0.00';
  return `₹${(value / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function toNumber(value: string | number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function rupeesToPaise(rupees: string): number {
  return Math.round(toNumber(rupees) * 100);
}

export function statusPill(status: GoodsReceiptQcStatus): 'green' | 'gold' {
  return status === 'CHECKED' ? 'green' : 'gold';
}

export function filteredBills(
  items: GoodsReceiptSummary[],
  query: string,
): GoodsReceiptSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((row) => {
    const hay = [
      row.receiptNumber,
      row.receiptReference,
      row.supplierLegalName,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function monthKeyIst(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
  } catch {
    return iso.slice(0, 7);
  }
}

export function currentMonthKeyIst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
}

export type PurchasesKpis = {
  monthSpendPaise: number;
  monthBillCount: number;
  monthGstPaise: number;
  totalGrns: number;
};

export function summaryKpis(items: GoodsReceiptSummary[]): PurchasesKpis {
  const month = currentMonthKeyIst();
  let monthSpendPaise = 0;
  let monthBillCount = 0;
  let monthGstPaise = 0;
  for (const row of items) {
    if (monthKeyIst(row.createdAt) === month) {
      monthSpendPaise += row.totalPaise ?? 0;
      monthGstPaise += row.taxPaise ?? 0;
      monthBillCount += 1;
    }
  }
  return {
    monthSpendPaise,
    monthBillCount,
    monthGstPaise,
    totalGrns: items.length,
  };
}

export function lineMoney(
  quantity: string,
  rateRupees: string,
  gstRate: number | null | undefined,
): { taxablePaise: number; taxPaise: number; totalPaise: number; units: number } {
  const units = toNumber(quantity);
  const taxablePaise = Math.round(units * toNumber(rateRupees) * 100);
  const rate = gstRate == null ? 0 : gstRate;
  const taxPaise =
    rate > 0 ? Math.round((taxablePaise * rate) / 100) : 0;
  return {
    taxablePaise,
    taxPaise,
    totalPaise: taxablePaise + taxPaise,
    units,
  };
}

export function entryTotals(
  lines: EntryLine[],
  productsById: Map<string, Product>,
): { lineCount: number; units: number; taxablePaise: number; taxPaise: number; totalPaise: number } {
  let lineCount = 0;
  let units = 0;
  let taxablePaise = 0;
  let taxPaise = 0;
  for (const line of lines) {
    if (!line.productId || toNumber(line.quantity) <= 0) continue;
    const product = productsById.get(line.productId);
    const money = lineMoney(line.quantity, line.rateRupees, product?.gstRate);
    lineCount += 1;
    units += money.units + toNumber(line.freeQuantity);
    taxablePaise += money.taxablePaise;
    taxPaise += money.taxPaise;
  }
  return {
    lineCount,
    units,
    taxablePaise,
    taxPaise,
    totalPaise: taxablePaise + taxPaise,
  };
}

export function validateEntry(draft: EntryDraft): string | null {
  if (!draft.supplierId) return 'Pick a distributor.';
  if (!draft.invoiceNo.trim()) return 'Enter the distributor invoice no.';
  if (!draft.invoiceDate) return 'Enter the invoice date.';
  const filled = draft.lines.filter(
    (line) => line.productId && toNumber(line.quantity) + toNumber(line.freeQuantity) > 0,
  );
  if (filled.length === 0) return 'Add at least one billed line with qty.';
  for (const line of filled) {
    if (!line.productId) return 'Every line needs a product.';
    if (toNumber(line.quantity) < 0 || toNumber(line.freeQuantity) < 0) {
      return 'Qty cannot be negative.';
    }
    if (toNumber(line.quantity) > 0 && toNumber(line.rateRupees) < 0) {
      return 'Rate cannot be negative.';
    }
    if (toNumber(line.quantity) > 0 && line.rateRupees.trim() === '') {
      return 'Enter Rate / PTR for charged qty.';
    }
  }
  const productIds = filled.map((line) => line.productId);
  if (new Set(productIds).size !== productIds.length) {
    return 'Each product can appear on only one line.';
  }
  return null;
}

export function mapLoadError(error: ApiError): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') return 'denied';
  if (error.code === 'NO_ACTIVE_BRANCH') return 'no_branch';
  return 'failure';
}

export function mapCreateError(error: ApiError): CreateStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN' || error.code === 'PLAN_LIMIT') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'DUPLICATE_RECEIPT' ||
    error.code === 'STALE_STATE' ||
    error.code === 'IDEMPOTENCY_CONFLICT'
  ) {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'PRICE_MISMATCH'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function reuseIdempotencyKey(storageKey: string): string {
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem(storageKey, next);
  return next;
}

export function clearIdempotencyKey(storageKey: string): void {
  sessionStorage.removeItem(storageKey);
}

export const BILL_IDEMPOTENCY_KEY = 'namma.purchases.receiveBill';
export const INDENT_IDEMPOTENCY_KEY = 'namma.purchases.indent';
export const REORDER_IDEMPOTENCY_KEY = 'namma.purchases.reorder';

export function deliveryIdempotencyKey(poId: string): string {
  return `namma.purchases.delivery.${poId}`;
}

export function validateIndent(draft: EntryDraft): string | null {
  if (!draft.supplierId) return 'Pick a distributor.';
  const filled = draft.lines.filter(
    (line) => line.productId && toNumber(line.quantity) + toNumber(line.freeQuantity) > 0,
  );
  if (filled.length === 0) return 'Add at least one indent line with qty.';
  for (const line of filled) {
    if (toNumber(line.quantity) < 0 || toNumber(line.freeQuantity) < 0) {
      return 'Qty cannot be negative.';
    }
    if (toNumber(line.quantity) > 0 && line.rateRupees.trim() === '') {
      return 'Enter Rate / PTR for charged qty.';
    }
  }
  return null;
}

export function openIndents<T extends { status: string }>(orders: T[]): T[] {
  return orders.filter((row) => row.status === 'DRAFT' || row.status === 'ISSUED');
}

export function productLabel(product: Product): string {
  const pack = product.packDescription?.trim();
  return pack ? `${product.name} · ${pack}` : product.name;
}
