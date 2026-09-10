import { Button } from '@atoms';
import type { StockAdjustment } from '@/services/inventoryAdjustments';
import { adjustmentReasonLabel } from '../../InventoryScreen.utils';

export type AdjustmentListProps = {
  title: string;
  emptyLabel: string;
  items: StockAdjustment[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  busyId?: string | null;
};

export function AdjustmentList({
  title,
  emptyLabel,
  items,
  onApprove,
  onReject,
  busyId,
}: AdjustmentListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line/70 bg-surface">
      <header className="border-b border-line/70 bg-brand-soft/50 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-line/60 overflow-y-auto">
          {items.map((row) => {
            const busy = busyId === row.id;
            return (
              <li key={row.id} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {row.productName} × {row.quantity}
                  </p>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand">
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {adjustmentReasonLabel(row.reason)} · {row.batchNumber ?? 'no batch'} ·{' '}
                  {row.direction === 'IN' ? 'add to book' : 'remove from book'}
                </p>
                {row.status === 'PENDING' && (onApprove || onReject) ? (
                  <div className="flex flex-wrap gap-2">
                    {onApprove ? (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg"
                        disabled={busy}
                        onClick={() => onApprove(row.id)}
                      >
                        Approve write-off
                      </Button>
                    ) : null}
                    {onReject ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={busy}
                        onClick={() => onReject(row.id)}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
