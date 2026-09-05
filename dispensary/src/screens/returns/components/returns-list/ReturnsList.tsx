import type { SalesReturnSummary } from '@/services/salesReturns';
import { formatPaise, refundModeLabel } from '../../ReturnsScreen.utils';

export type ReturnsListProps = {
  items: SalesReturnSummary[];
};

export function ReturnsList({ items }: ReturnsListProps) {
  if (items.length === 0) {
    return (
      <p className="border border-line bg-surface px-3 py-2 text-sm text-muted">
        No returns recorded at this outlet yet.
      </p>
    );
  }

  return (
    <section className="border border-line bg-surface">
      <h2 className="border-b border-line px-3 py-2 text-sm font-semibold text-ink">
        Recorded returns
      </h2>
      <ul className="divide-y divide-line">
        {items.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
            <div>
              <p className="text-sm text-ink">{row.invoiceNumber}</p>
              <p className="text-xs text-muted">{row.reason}</p>
            </div>
            <p className="font-mono text-xs tabular-nums text-ink">
              {refundModeLabel(row.refundMode)} {formatPaise(row.refundTotalPaise)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
