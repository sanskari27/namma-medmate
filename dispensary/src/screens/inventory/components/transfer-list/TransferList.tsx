import { Button } from '@atoms';
import type { StockTransfer } from '@/services/stockTransfers';

export type TransferListProps = {
  title: string;
  emptyLabel: string;
  items: StockTransfer[];
  branchName: (id: string) => string;
  activeBranchId: string;
  onDispatch?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  busyId?: string | null;
};

export function TransferList({
  title,
  emptyLabel,
  items,
  branchName,
  activeBranchId,
  onDispatch,
  onConfirm,
  onReject,
  onCancel,
  busyId,
}: TransferListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line/70 bg-surface">
      <header className="border-b border-line/70 bg-brand-soft/50 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-line/60 overflow-y-auto">
          {items.map((transfer) => {
            const line = transfer.lines[0];
            const summary = line
              ? `${line.productName} × ${line.quantity}`
              : `${transfer.lines.length} lines`;
            const isSender = transfer.fromBranchId === activeBranchId;
            const isReceiver = transfer.toBranchId === activeBranchId;
            const busy = busyId === transfer.id;
            return (
              <li key={transfer.id} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{summary}</p>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand">
                    {transfer.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {branchName(transfer.fromBranchId)} → {branchName(transfer.toBranchId)} ·{' '}
                  {transfer.direction}
                </p>
                <div className="flex flex-wrap gap-2">
                  {isSender && transfer.status === 'REQUESTED' && onDispatch ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => onDispatch(transfer.id)}
                    >
                      Dispatch
                    </Button>
                  ) : null}
                  {isReceiver && transfer.status === 'IN_TRANSIT' && onConfirm ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => onConfirm(transfer.id)}
                    >
                      Confirm receipt
                    </Button>
                  ) : null}
                  {isReceiver && transfer.status === 'IN_TRANSIT' && onReject ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => onReject(transfer.id)}
                    >
                      Reject
                    </Button>
                  ) : null}
                  {transfer.status === 'REQUESTED' && onCancel ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => onCancel(transfer.id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
