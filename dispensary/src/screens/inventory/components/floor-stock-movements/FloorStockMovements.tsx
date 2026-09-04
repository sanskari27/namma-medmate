import type { StockMovement } from '@/services/inventory';

export type FloorStockMovementsProps = {
  movements: StockMovement[];
  loading: boolean;
};

function formatIst(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function FloorStockMovements({ movements, loading }: FloorStockMovementsProps) {
  return (
    <section className="border border-line bg-surface p-4" aria-label="Movement history">
      <p className="font-mono text-[11px] tracking-wide text-muted">Movement history</p>
      <p className="mt-1 text-sm text-muted">
        Immutable stock-in and stock-out facts for this outlet.
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-muted" role="status">
          Loading movements…
        </p>
      ) : movements.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No movements yet for this selection.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5" aria-label="Stock movements">
          {movements.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border border-line px-2.5 py-1.5 text-sm"
            >
              <span className="font-mono text-ink">
                {row.type === 'STOCK_IN' ? 'In' : 'Out'} {row.quantity}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted">
                Bal {row.balanceAfter} · {formatIst(row.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
