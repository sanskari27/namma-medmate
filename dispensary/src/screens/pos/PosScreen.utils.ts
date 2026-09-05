import type { SafetyCheckStatus, SafetyWarning } from '@/services/medicationSafety';
import type { Product } from '@/services/products';
import type { SalesInvoice } from '@/services/salesInvoices';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'BANK_TRANSFER';

export type TenderDraft = {
  cashRupees: string;
  cardRupees: string;
  upiRupees: string;
  creditRupees: string;
  bankRupees: string;
  cardReference: string;
  upiReference: string;
  bankReference: string;
};

export const emptyTender = (): TenderDraft => ({
  cashRupees: '',
  cardRupees: '',
  upiRupees: '',
  creditRupees: '',
  bankRupees: '',
  cardReference: '',
  upiReference: '',
  bankReference: '',
});

const CONTROLLED_SCHEDULES = new Set(['H', 'H1', 'X', 'NDPS']);

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function hasLoyaltyAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('LOYALTY'));
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

export function isPrescriptionProduct(product: Product): boolean {
  return product.prescriptionRequired || isControlledProduct(product);
}

export function statusCopy(
  status: PageStatus,
  invoiceNumber?: string | null,
  hint?: string | null,
): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading catalogue for this till…';
    case 'empty':
      return 'No medicines in the catalogue yet. Add stock in Inventory, then build a draft here.';
    case 'validation':
      return 'Add a medicine with MRP and selling price. Walk-in can skip the patient. Safety complete still needs a linked customer and a review reason when warnings appear. Schedule packs need a patient, prescriber, and Prescription checked. Rx packs need an Rx reference, Prescription checked, and prescribed qty. Tax override needs a reason. Discount over the sign-off limit waits for approval.';
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

export function offerStatusHint(status: PageStatus, code?: string | null): string | null {
  if (code === 'AMBIGUOUS_PRECEDENCE') {
    return 'Two live schemes share the same priority on a line. Change priority on Schemes, then apply again.';
  }
  if (status === 'validation') {
    return 'Save this bill first, then apply a scheme.';
  }
  if (status === 'conflict') {
    return 'This bill was updated on another till. Refresh, then apply the scheme again.';
  }
  if (status === 'failure') {
    return 'Could not apply this scheme. Check the connection and try again.';
  }
  return null;
}

export function holdStatusHint(status: PageStatus): string | null {
  if (status === 'loading') {
    return null;
  }
  if (status === 'validation') {
    return 'Save this bill first, then hold it if the patient steps away.';
  }
  if (status === 'conflict') {
    return 'This bill was updated on another till. Refresh, then hold again.';
  }
  if (status === 'failure') {
    return 'Could not hold this bill. Check the connection and try again.';
  }
  return null;
}

export function resumeStatusHint(
  invoiceNumber: string | null,
  revalidation: {
    stock: boolean;
    expiry: boolean;
    price: boolean;
    tax: boolean;
    approval: boolean;
  } | null,
): string {
  const held = invoiceNumber
    ? `Held bill ${invoiceNumber} is back on this till.`
    : 'Held bill is back on this till.';
  if (
    revalidation &&
    (revalidation.stock ||
      revalidation.expiry ||
      revalidation.price ||
      revalidation.tax ||
      revalidation.approval)
  ) {
    return `${held} Floor qty, price, or GST changed — review before collect.`;
  }
  return held;
}

export function mapApiStatus(error: { status?: number; code?: string | null }): PageStatus {
  if (
    error.status === 403 ||
    error.code === 'FORBIDDEN' ||
    error.code === 'PHARMACIST_REQUIRED' ||
    error.code === 'PLAN_LIMIT'
  ) {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'CONFLICT' ||
    error.code === 'STALE_STOCK' ||
    error.code === 'STALE_STATE' ||
    error.code === 'INSUFFICIENT_STOCK' ||
    error.code === 'NUMBER_COLLISION' ||
    error.code === 'DUPLICATE_COMPLETION'
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
    error.code === 'PRICE_INVALID' ||
    error.code === 'EXCESSIVE_DISCOUNT' ||
    error.code === 'JURISDICTION_INVALID' ||
    error.code === 'TAX_RATE_INVALID' ||
    error.code === 'REASON_REQUIRED' ||
    error.code === 'APPROVAL_REQUIRED' ||
    error.code === 'UNDER_ALLOCATION' ||
    error.code === 'OVER_ALLOCATION' ||
    error.code === 'INVALID_CHANGE' ||
    error.code === 'CREDIT_LIMIT_EXCEEDED' ||
    error.code === 'KHATA_REQUIRES_CUSTOMER' ||
    error.code === 'INSUFFICIENT_POINTS' ||
    error.code === 'REDEEM_LIMIT' ||
    error.code === 'LOYALTY_REQUIRES_CUSTOMER' ||
    error.code === 'RX_REQUIRED' ||
    error.code === 'OVER_FULFILLMENT' ||
    error.code === 'FOREIGN_REFERENCE' ||
    error.code === 'PRESCRIBED_REQUIRED'
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

export function paiseToRupees(paise: number): string {
  if (paise === 0) {
    return '';
  }
  return String(paise / 100);
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
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxJurisdiction: 'INTRA' | 'INTER' | null;
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
  const cgst = Math.floor(tax / 2);
  return {
    subtotalPaise: subtotal,
    discountPaise: discount,
    taxPaise: tax,
    totalPaise: subtotal + tax,
    cgstPaise: cgst,
    sgstPaise: tax - cgst,
    igstPaise: 0,
    taxJurisdiction: 'INTRA',
  };
}

export function invoiceTotals(invoice: SalesInvoice | null, lines: DraftMoneyLine[]): BillTotals {
  if (invoice) {
    return {
      subtotalPaise: invoice.subtotalPaise,
      discountPaise: invoice.discountPaise,
      taxPaise: invoice.taxPaise,
      totalPaise: invoice.totalPaise,
      cgstPaise: invoice.cgstPaise ?? 0,
      sgstPaise: invoice.sgstPaise ?? 0,
      igstPaise: invoice.igstPaise ?? 0,
      taxJurisdiction: invoice.taxJurisdiction ?? 'INTRA',
    };
  }
  return previewTotals(lines);
}

export function percentToBps(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100);
}

export function discountApprovalCopy(
  status: SalesInvoice['discountApprovalStatus'] | null | undefined,
): string | null {
  if (status === 'PENDING') {
    return 'Waiting for sign-off on this discount before the bill can complete.';
  }
  if (status === 'APPROVED') {
    return 'Discount signed off. You can complete this bill when the rest of the till is ready.';
  }
  if (status === 'REJECTED') {
    return 'Reduce the discount and apply on this bill again.';
  }
  return null;
}

export type TenderPart = {
  mode: PaymentMode;
  amountPaise: number;
  reference: string | null;
};

export type TenderPreview = {
  paidPaise: number;
  duePaise: number;
  changePaise: number;
  remainingPaise: number;
  parts: TenderPart[];
  invalid: boolean;
};

function fieldPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  return rupeesToPaise(trimmed);
}

export function previewTender(totalPaise: number, tender: TenderDraft): TenderPreview {
  const cash = fieldPaise(tender.cashRupees);
  const card = fieldPaise(tender.cardRupees);
  const upi = fieldPaise(tender.upiRupees);
  const credit = fieldPaise(tender.creditRupees);
  const bank = fieldPaise(tender.bankRupees);
  const invalid = cash == null || card == null || upi == null || credit == null || bank == null;
  const amounts: TenderPart[] = [
    { mode: 'CASH', amountPaise: cash ?? 0, reference: null },
    { mode: 'CARD', amountPaise: card ?? 0, reference: tender.cardReference.trim() || null },
    { mode: 'UPI', amountPaise: upi ?? 0, reference: tender.upiReference.trim() || null },
    { mode: 'CREDIT', amountPaise: credit ?? 0, reference: null },
    {
      mode: 'BANK_TRANSFER',
      amountPaise: bank ?? 0,
      reference: tender.bankReference.trim() || null,
    },
  ];
  const parts = amounts.filter((part) => part.amountPaise > 0);
  const paidPaise = parts.reduce((sum, part) => sum + part.amountPaise, 0);
  const duePaise = credit ?? 0;
  const changePaise = Math.max(0, paidPaise - totalPaise);
  return {
    paidPaise,
    duePaise,
    changePaise,
    remainingPaise: Math.max(0, totalPaise - paidPaise),
    parts,
    invalid,
  };
}

export function collectStatusHint(status: PageStatus, code?: string | null): string | null {
  if (status === 'denied' && code === 'PLAN_LIMIT') {
    return 'Not on this plan. Points stay on the patient until Growth or Pro is back.';
  }
  if (status === 'validation') {
    if (code === 'CREDIT_LIMIT_EXCEEDED') {
      return 'Khata is over the approved limit. Reduce khata or take cash, UPI, card, or bank.';
    }
    if (code === 'KHATA_REQUIRES_CUSTOMER') {
      return 'Link a patient before putting this bill on khata.';
    }
    if (code === 'INSUFFICIENT_POINTS') {
      return 'This patient does not have enough points for that redeem.';
    }
    if (code === 'REDEEM_LIMIT') {
      return 'Points can cover at most 20% of this bill.';
    }
    if (code === 'LOYALTY_REQUIRES_CUSTOMER') {
      return 'Link a patient before using points.';
    }
    return 'Tender must cover this bill. Add the rest or put it on khata for a linked patient.';
  }
  if (status === 'conflict') {
    return 'This bill total changed. Refresh, then collect again.';
  }
  if (status === 'failure') {
    return 'Could not collect this bill. Check the connection and try again.';
  }
  return null;
}

export function invoiceOutputHint(status: PageStatus, code?: string | null): string | null {
  if (status === 'loading') {
    return 'Preparing the A4 bill…';
  }
  if (status === 'empty') {
    return 'Collect this bill to print the A4 invoice.';
  }
  if (status === 'validation' || code === 'CUSTOMER_EMAIL_REQUIRED') {
    return 'This patient has no email on file. Add one before sending a bill copy.';
  }
  if (status === 'denied') {
    return 'This till cannot print Sales bills.';
  }
  if (status === 'conflict') {
    return 'This bill changed. Refresh, then print again.';
  }
  if (status === 'failure') {
    return 'Could not prepare this A4 bill. Check the line and try again.';
  }
  if (status === 'success') {
    return code === 'email' ? 'Bill copy queued for this patient.' : 'A4 bill ready.';
  }
  return null;
}
