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
    <section className="min-h-0 flex-1 border border-line bg-surface">
      <header className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((row) => {
            const busy = busyId === row.id;
            return (
              <li key={row.id} className="grid gap-2 px-3 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {row.productName} × {row.quantity}
                  </p>
                  <p className="font-mono text-xs text-muted">{row.status}</p>
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
