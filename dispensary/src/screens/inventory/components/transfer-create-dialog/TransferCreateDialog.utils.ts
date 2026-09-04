import type { StockTransferDirection } from '@/services/stockTransfers';
import { isApiError } from '@/services/stockTransfers';

export type TransferDialogStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export function mapTransferDialogStatus(error: unknown): TransferDialogStatus {
  if (!isApiError(error)) {
    return 'failure';
  }
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'IDEMPOTENCY_CONFLICT' ||
    error.code === 'STALE_STATE'
  ) {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'SAME_BRANCH' ||
    error.code === 'INSUFFICIENT_STOCK'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function transferDialogStatusText(status: TransferDialogStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Preparing transfer form…';
    case 'empty':
      return 'Nothing to transfer from this till yet. Receive stock before pushing.';
    case 'validation':
      return 'Pick another outlet and a valid quantity. Pull needs a product (and batch when required).';
    case 'denied':
      return 'This till cannot start a transfer.';
    case 'conflict':
      return 'Transfer conflict. Refresh and try again.';
    case 'failure':
      return 'Could not start the transfer. Try again.';
    case 'success':
      return 'Transfer started.';
    default:
      return null;
  }
}

export type TransferCreateDraft = {
  direction: StockTransferDirection;
  counterpartyId: string;
  balanceKey: string;
  productId: string;
  batchId: string;
  quantity: string;
};
