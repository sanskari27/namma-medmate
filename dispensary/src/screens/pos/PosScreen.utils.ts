import type { SafetyCheckStatus, SafetyWarning } from '@/services/medicationSafety';
import type { Product } from '@/services/products';
import type { SalesInvoice } from '@/services/salesInvoices';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

const CONTROLLED_SCHEDULES = new Set(['H', 'H1', 'X', 'NDPS']);

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function canDispenseControlled(
  role: string | undefined,
  roles: { code: string | null }[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return Boolean(roles?.some((item) => item.code === 'pharmacist'));
}

export function isControlledProduct(product: Product): boolean {
  if (product.controlledSubstance) {
    return true;
  }
  return (
    product.scheduleClassification != null &&
    CONTROLLED_SCHEDULES.has(product.scheduleClassification)
  );
}

export function statusCopy(status: PageStatus, invoiceNumber?: string | null): string | null {
  switch (status) {
    case 'loading':
      return 'Loading catalogue for this till…';
    case 'empty':
      return 'No medicines in the catalogue yet. Add stock in Inventory, then build a draft here.';
    case 'validation':
      return 'Add a medicine with MRP and selling price. Walk-in can skip the patient. Safety complete still needs a linked customer and a review reason when warnings appear. Schedule packs need a patient, prescriber, and Prescription checked.';
    case 'denied':
      return 'This till cannot save Sales bills, or a cashier-only login cannot dispense Schedule H, H1, X, or NDPS stock.';
    case 'conflict':
      return 'Draft warnings, floor qty, or this bill changed. Re-check, then save again.';
    case 'failure':
      return 'Could not save this bill. Check the connection and try again.';
    case 'success':
      return invoiceNumber
        ? `Bill ${invoiceNumber} saved as a draft at this till.`
        : 'Safety review recorded. Sale posting still waits on a saved bill.';
    default:
      return null;
  }
}

export function mapApiStatus(error: { status?: number; code?: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN' || error.code === 'PHARMACIST_REQUIRED') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'CONFLICT' ||
    error.code === 'STALE_STOCK' ||
    error.code === 'STALE_STATE' ||
    error.code === 'NUMBER_COLLISION'
  ) {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'UNLINKED_CUSTOMER' ||
    error.code === 'INCOMPLETE_CONTROLLED' ||
    error.code === 'INVALID_UOM' ||
    error.code === 'FOREIGN_BATCH' ||
    error.code === 'PRICE_INVALID'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function checkStatusLabel(
  checkStatus: SafetyCheckStatus | null,
  checkLabel: string | null,
): string | null {
  if (!checkStatus) {
    return null;
  }
  if (checkStatus === 'INCOMPLETE' || checkStatus === 'NOT_CHECKED') {
    return checkLabel ?? 'Not checked';
  }
  return null;
}

export function warningSummary(
  warning: SafetyWarning,
  productNames?: Record<string, string>,
): string {
  if (warning.kind === 'ALLERGY') {
    const productName = (warning.productId && productNames?.[warning.productId]) || 'this medicine';
    return `Allergy match: ${warning.matchedAllergen ?? 'allergen'} on ${productName} — review before completing.`;
  }
  const names =
    warning.productIds
      ?.map((id) => productNames?.[id])
      .filter(Boolean)
      .join(', ') || 'draft lines';
  return `Same composition on ${names} (${warning.matchedComposition ?? 'composition'}) — review before completing.`;
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function rupeesToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100);
}

export type DraftMoneyLine = {
  quantity: string;
  mrpRupees: string;
  sellingRupees: string;
  discountRupees: string;
  gstRate: number | null;
};

export type BillTotals = {
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
};

export function previewTotals(lines: DraftMoneyLine[]): BillTotals {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const line of lines) {
    const qty = Number(line.quantity);
    const selling = rupeesToPaise(line.sellingRupees);
    const mrp = rupeesToPaise(line.mrpRupees);
    const lineDiscount = rupeesToPaise(line.discountRupees) ?? 0;
    if (!Number.isFinite(qty) || qty <= 0 || selling == null || mrp == null) {
      continue;
    }
    const gross = Math.round(qty * selling);
    const clippedDiscount = Math.min(lineDiscount, gross);
    const taxable = gross - clippedDiscount;
    const rate = line.gstRate ?? 0;
    const lineTax = Math.round((taxable * rate) / 100);
    subtotal += taxable;
    discount += clippedDiscount;
    tax += lineTax;
  }
  return {
    subtotalPaise: subtotal,
    discountPaise: discount,
    taxPaise: tax,
    totalPaise: subtotal + tax,
  };
}

export function invoiceTotals(invoice: SalesInvoice | null, lines: DraftMoneyLine[]): BillTotals {
  if (invoice) {
    return {
      subtotalPaise: invoice.subtotalPaise,
      discountPaise: invoice.discountPaise,
      taxPaise: invoice.taxPaise,
      totalPaise: invoice.totalPaise,
    };
  }
  return previewTotals(lines);
}
