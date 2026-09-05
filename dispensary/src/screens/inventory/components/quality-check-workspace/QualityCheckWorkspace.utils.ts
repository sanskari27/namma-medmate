import { isApiError } from '@/services/axios';
import type {
  GoodsReceiptDetail,
  GoodsReceiptQcLine,
  GoodsReceiptQcStatus,
} from '@/services/goodsReceipts';
import type { PageStatus } from '../../InventoryScreen.utils';

export type QcLineDraft = {
  goodsReceiptLineId: string;
  accepted: string;
  rejected: string;
  batchNumber: string;
  manufacturedOn: string;
  expiresOn: string;
};

export type QcChecklistState = {
  visualInspectionPassed: boolean;
  packagingIntact: boolean;
  labelMatches: boolean;
  batchReadable: boolean;
  noDamage: boolean;
};

export const emptyChecklist: QcChecklistState = {
  visualInspectionPassed: false,
  packagingIntact: false,
  labelMatches: false,
  batchReadable: false,
  noDamage: false,
};

export function toNumber(value: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function draftsFromLines(lines: GoodsReceiptQcLine[]): QcLineDraft[] {
  return lines.map((line) => ({
    goodsReceiptLineId: line.id,
    accepted: '',
    rejected: '',
    batchNumber: '',
    manufacturedOn: '',
    expiresOn: '',
  }));
}

export function formatIst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function receiptQcLabel(status: GoodsReceiptQcStatus): string {
  return status === 'CHECKED' ? 'Checked' : 'Pending pharmacist check';
}

export function checklistComplete(checklist: QcChecklistState): boolean {
  return (
    checklist.visualInspectionPassed &&
    checklist.packagingIntact &&
    checklist.labelMatches &&
    checklist.batchReadable &&
    checklist.noDamage
  );
}

export function validateQc(
  detail: GoodsReceiptDetail,
  drafts: QcLineDraft[],
  checklist: QcChecklistState,
): boolean {
  if (drafts.length !== detail.lines.length) {
    return false;
  }
  let accepting = false;
  for (let i = 0; i < detail.lines.length; i += 1) {
    const line = detail.lines[i];
    const draft = drafts[i];
    if (!line || !draft) {
      return false;
    }
    const accepted = toNumber(draft.accepted);
    const rejected = toNumber(draft.rejected);
    if (accepted < 0 || rejected < 0) {
      return false;
    }
    if (accepted + rejected !== toNumber(line.quantity)) {
      return false;
    }
    if (accepted > 0) {
      accepting = true;
      if (line.requiresBatchTracking && (!draft.batchNumber.trim() || !draft.expiresOn)) {
        return false;
      }
    }
  }
  if (accepting && !checklistComplete(checklist)) {
    return false;
  }
  return true;
}

export function mapQcStatus(error: unknown): PageStatus {
  if (!isApiError(error)) {
    return 'failure';
  }
  if (error.status === 403 || error.code === 'PHARMACIST_REQUIRED' || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'STALE_STATE' ||
    error.code === 'IDEMPOTENCY_CONFLICT'
  ) {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}
