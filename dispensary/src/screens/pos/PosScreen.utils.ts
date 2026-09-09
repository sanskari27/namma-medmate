import type { SafetyCheckStatus, SafetyWarning } from '@/services/medicationSafety';
import type { Product } from '@/services/products';
import type { SalesInvoice } from '@/services/salesInvoices';
import { POS_CONTENT, posStatusMessage } from './PosScreen.content';
import type { PageStatus } from './pos.types';

export type { PageStatus } from './pos.types';

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
  return posStatusMessage(status, invoiceNumber, hint);
}

export function offerStatusHint(status: PageStatus, code?: string | null): string | null {
  if (code === 'AMBIGUOUS_PRECEDENCE') {
    return POS_CONTENT.offer.ambiguous;
  }
  if (status === 'validation') {
    return POS_CONTENT.offer.validation;
  }
  if (status === 'conflict') {
    return POS_CONTENT.offer.conflict;
  }
  if (status === 'failure') {
    return POS_CONTENT.offer.failure;
  }
  return null;
}

export function holdStatusHint(status: PageStatus): string | null {
  if (status === 'loading') {
    return null;
  }
  if (status === 'validation') {
    return POS_CONTENT.holdHints.validation;
  }
  if (status === 'conflict') {
    return POS_CONTENT.holdHints.conflict;
  }
  if (status === 'failure') {
    return POS_CONTENT.holdHints.failure;
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
  kind: 'held' | 'draft' = 'held',
): string {
  const held =
    kind === 'draft' && invoiceNumber
      ? POS_CONTENT.resume.draftWithNumber(invoiceNumber)
      : invoiceNumber
        ? POS_CONTENT.resume.withNumber(invoiceNumber)
        : POS_CONTENT.resume.withoutNumber;
  if (
    revalidation &&
    (revalidation.stock ||
      revalidation.expiry ||
      revalidation.price ||
      revalidation.tax ||
      revalidation.approval)
  ) {
    return `${held}${POS_CONTENT.resume.reviewSuffix}`;
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
    error.code === 'ARCHIVED_REFERENCE' ||
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
    return checkLabel ?? POS_CONTENT.safety.notChecked;
  }
  return null;
}

export function warningSummary(
  warning: SafetyWarning,
  productNames?: Record<string, string>,
): string {
  if (warning.kind === 'ALLERGY') {
    const productName =
      (warning.productId && productNames?.[warning.productId]) || POS_CONTENT.safety.thisMedicine;
    return POS_CONTENT.safety.allergy(
      warning.matchedAllergen ?? POS_CONTENT.safety.allergenFallback,
      productName,
    );
  }
  const names =
    warning.productIds
      ?.map((id) => productNames?.[id])
      .filter(Boolean)
      .join(', ') || POS_CONTENT.safety.draftLines;
  return POS_CONTENT.safety.composition(
    names,
    warning.matchedComposition ?? POS_CONTENT.safety.compositionFallback,
  );
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
    return POS_CONTENT.discountApproval.pending;
  }
  if (status === 'APPROVED') {
    return POS_CONTENT.discountApproval.approved;
  }
  if (status === 'REJECTED') {
    return POS_CONTENT.discountApproval.rejected;
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
    return POS_CONTENT.collect.planLimit;
  }
  if (status === 'validation') {
    if (code === 'CREDIT_LIMIT_EXCEEDED') {
      return POS_CONTENT.collect.creditLimit;
    }
    if (code === 'KHATA_REQUIRES_CUSTOMER') {
      return POS_CONTENT.collect.khataCustomer;
    }
    if (code === 'INSUFFICIENT_POINTS') {
      return POS_CONTENT.collect.insufficientPoints;
    }
    if (code === 'REDEEM_LIMIT') {
      return POS_CONTENT.collect.redeemLimit;
    }
    if (code === 'LOYALTY_REQUIRES_CUSTOMER') {
      return POS_CONTENT.collect.loyaltyCustomer;
    }
    return POS_CONTENT.collect.validation;
  }
  if (status === 'conflict') {
    return POS_CONTENT.collect.conflict;
  }
  if (status === 'failure') {
    return POS_CONTENT.collect.failure;
  }
  return null;
}

export function invoiceOutputHint(status: PageStatus, code?: string | null): string | null {
  if (status === 'loading') {
    return POS_CONTENT.invoiceOutput.loading;
  }
  if (status === 'empty') {
    return POS_CONTENT.invoiceOutput.empty;
  }
  if (status === 'validation' || code === 'CUSTOMER_EMAIL_REQUIRED') {
    return POS_CONTENT.invoiceOutput.emailRequired;
  }
  if (status === 'denied') {
    return POS_CONTENT.invoiceOutput.denied;
  }
  if (status === 'conflict') {
    return POS_CONTENT.invoiceOutput.conflict;
  }
  if (status === 'failure') {
    return POS_CONTENT.invoiceOutput.failure;
  }
  if (status === 'success') {
    return code === 'email'
      ? POS_CONTENT.invoiceOutput.emailQueued
      : POS_CONTENT.invoiceOutput.ready;
  }
  return null;
}
