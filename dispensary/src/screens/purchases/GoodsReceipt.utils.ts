import type { GoodsReceiptOutstandingLine } from '@/services/purchaseOrders';
import type { PageStatus } from './PurchasesScreen.utils';

export type ReceiptLineDraft = {
  purchaseOrderLineId: string;
  quantity: string;
  rateRupees: string;
};

export function toNumber(value: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatQty(value: number | string): string {
  return String(toNumber(value));
}

export function remainingAfter(remaining: number | string, current: string): number {
  return toNumber(remaining) - (current.trim() === '' ? 0 : toNumber(current));
}

export function isOverQty(remaining: number | string, current: string): boolean {
  if (current.trim() === '') {
    return false;
  }
  const qty = toNumber(current);
  return qty > toNumber(remaining);
}

export function isRateMismatch(unitRatePaise: number, rateRupees: string): boolean {
  if (rateRupees.trim() === '') {
    return true;
  }
  return Math.round(toNumber(rateRupees) * 100) !== unitRatePaise;
}

export function hasPending(lines: GoodsReceiptOutstandingLine[]): boolean {
  return lines.some((line) => toNumber(line.remainingQuantity) > 0);
}

export function receiptQcStatus(status: string): string {
  return status === 'CHECKED' ? 'Checked' : 'Pending pharmacist check';
}

export function draftsFromLines(lines: GoodsReceiptOutstandingLine[]): ReceiptLineDraft[] {
  return lines.map((line) => ({
    purchaseOrderLineId: line.purchaseOrderLineId,
    quantity: '',
    rateRupees: String(line.unitRatePaise / 100),
  }));
}

export function validateDelivery(
  reference: string,
  lines: GoodsReceiptOutstandingLine[],
  drafts: ReceiptLineDraft[],
): boolean {
  if (!reference.trim()) {
    return false;
  }
  const filled = drafts.filter((draft) => toNumber(draft.quantity) > 0);
  if (filled.length === 0) {
    return false;
  }
  return !drafts.some((draft, index) => {
    const line = lines[index];
    if (!line || toNumber(draft.quantity) <= 0) {
      return false;
    }
    return (
      isOverQty(line.remainingQuantity, draft.quantity) ||
      isRateMismatch(line.unitRatePaise, draft.rateRupees)
    );
  });
}

export function mapReceiptStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'DUPLICATE_RECEIPT' || error.code === 'STALE_STATE') {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'PRICE_MISMATCH' ||
    error.code === 'OVER_RECEIPT' ||
    error.code === 'PO_CLOSED' ||
    error.code === 'PO_NOT_ISSUED' ||
    error.code === 'INVALID_QUANTITY'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function receiptStatusText(status: PageStatus, code: string | null): string | null {
  if (code === 'PRICE_MISMATCH') {
    return 'Challan rate does not match the indent rate.';
  }
  if (code === 'OVER_RECEIPT') {
    return 'Qty is over what remains on this indent. Raise the ordered qty first.';
  }
  if (code === 'DUPLICATE_RECEIPT') {
    return 'This challan ref was already recorded on this outlet.';
  }
  switch (status) {
    case 'loading':
      return 'Loading outstanding against this indent…';
    case 'empty':
      return 'Nothing is still pending on this indent. All packs are in.';
    case 'validation':
      return 'Enter a challan ref and a qty that does not exceed outstanding.';
    case 'denied':
      return 'This till cannot record deliveries. Ask the owner to grant Purchases.';
    case 'conflict':
      return 'This challan ref was already recorded on this outlet.';
    case 'failure':
      return 'Could not record the delivery. Try again.';
    case 'success':
      return 'Delivery recorded. Packs stay pending QC — they are not on the shelf yet.';
    default:
      return null;
  }
}
