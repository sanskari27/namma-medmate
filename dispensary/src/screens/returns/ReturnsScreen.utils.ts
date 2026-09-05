import type { SalesInvoice } from '@/services/salesInvoices';
import type { SalesReturnRefundMode } from '@/services/salesReturns';
import { AlertCircle, CheckCircle2, RotateCcw, WifiOff } from 'lucide-react';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type LineDraft = Record<string, string>;

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading collected bills and returns at this counter…';
    case 'empty':
      return 'No collected bills to take back yet. Complete a sale first, then find the bill here.';
    case 'validation':
      return 'Find a collected bill, enter a qty still sold on that line, and say why it is coming back.';
    case 'denied':
      return 'This till cannot take sales back. Ask the owner to grant Sales.';
    case 'conflict':
      return 'This return request was already used with a different qty or refund. Refresh and try again.';
    case 'failure':
      return 'Could not record this return. Check the connection and try again.';
    case 'success':
      return 'Return recorded. Stock is back on the originating batch and the refund is ready.';
    default:
      return null;
  }
}

export function statusIcon(status: PageStatus) {
  if (status === 'success') {
    return CheckCircle2;
  }
  if (status === 'failure') {
    return WifiOff;
  }
  if (status === 'loading' || status === 'empty') {
    return RotateCcw;
  }
  return AlertCircle;
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (
    error.status === 409 ||
    error.code === 'STALE_STATE' ||
    error.code === 'IDEMPOTENCY_CONFLICT'
  ) {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422 || error.code === 'VALIDATION_ERROR') {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  switch (code) {
    case 'OVER_RETURN':
      return 'Cannot take back more than what is still sold on this bill.';
    case 'NOT_RETURNABLE':
      return 'This medicine is marked not returnable. Leave it on the bill.';
    case 'BATCH_EXPIRED':
      return 'That batch has expired and cannot go back on the floor.';
    case 'CREDIT_NOTE_CUSTOMER_REQUIRED':
      return 'A credit note needs the khata customer from the original bill. Use cash, or pick a billed patient.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This return request was already used with a different qty or refund.';
    default:
      return null;
  }
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function lineQuantity(value: number | string): number {
  return Number(value);
}

export function selectedReturnLines(invoice: SalesInvoice, qtyByLine: LineDraft) {
  return invoice.lines
    .map((line) => ({
      salesInvoiceLineId: line.id,
      quantity: Number(qtyByLine[line.id] ?? 0),
    }))
    .filter((line) => line.quantity > 0);
}

export function matchCompletedInvoice(
  invoices: SalesInvoice[],
  query: string,
): SalesInvoice | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  return invoices.find(
    (row) =>
      row.status === 'COMPLETED' &&
      (row.invoiceNumber.toLowerCase() === needle || row.id.toLowerCase() === needle),
  );
}

export function refundModeLabel(mode: SalesReturnRefundMode): string {
  return mode === 'CASH' ? 'Cash refund' : 'Credit note';
}
