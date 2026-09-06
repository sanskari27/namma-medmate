import type { SalesReturn } from '@/services/salesReturns';
import { formatPaise, refundModeLabel } from '../../ReturnsScreen.utils';

export type ReturnsRefundSummaryProps = {
  preview: SalesReturn;
};

export function ReturnsRefundSummary({ preview }: ReturnsRefundSummaryProps) {
  return (
    <aside className="border border-line bg-surface px-3 py-3">
      <h2 className="text-sm font-semibold text-ink">Refund and restock</h2>
      <dl className="mt-2 grid gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Mode</dt>
          <dd className="text-ink">{refundModeLabel(preview.refundMode)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Cash back</dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatPaise(preview.cashRefundPaise)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Credit note</dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatPaise(preview.creditNotePaise)}
          </dd>
        </div>
        <div className="flex justify-between gap-3 font-semibold">
          <dt className="text-ink">Total refund</dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatPaise(preview.refundTotalPaise)}
          </dd>
        </div>
      </dl>
      <ul className="mt-3 grid gap-1 text-xs text-muted">
        {preview.lines.map((line) => (
          <li key={`${line.salesInvoiceLineId}-${line.quantity}`}>
            Restock {line.quantity} {line.productName}
            {line.batchNumber ? ` to batch ${line.batchNumber}` : ''}
          </li>
        ))}
      </ul>
    </aside>
  );
}
