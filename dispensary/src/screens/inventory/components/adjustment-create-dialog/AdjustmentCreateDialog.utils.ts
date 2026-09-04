import { isApiError } from '@/services/inventoryAdjustments';

export type AdjustmentDialogStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export function mapAdjustmentDialogStatus(error: unknown): AdjustmentDialogStatus {
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
    error.code === 'UNKNOWN_REASON' ||
    error.code === 'INSUFFICIENT_STOCK' ||
    error.code === 'RULE_MISSING' ||
    error.code === 'SELF_APPROVAL'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function adjustmentDialogStatusText(status: AdjustmentDialogStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Preparing write-off form…';
    case 'empty':
      return 'Nothing on this till to write off yet. Receive stock first.';
    case 'validation':
      return 'Pick a stock line, an approved reason, and a quantity that is on the shelf.';
    case 'denied':
      return 'This till cannot record a write-off.';
    case 'conflict':
      return 'Write-off conflict. Refresh and try again.';
    case 'failure':
      return 'Could not record the write-off. Ask the owner if a write-off sign-off rule is missing.';
    case 'success':
      return 'Write-off sent for sign-off. Floor quantity is unchanged until approved.';
    default:
      return null;
  }
}
