import { Button } from '@atoms';
import type { SalesInvoice } from '@/services/salesInvoices';

interface PosHoldListProps {
  items: SalesInvoice[];
  loading: boolean;
  busy: boolean;
  onResume: (id: string) => void;
}

export function PosHoldList({ items, loading, busy, onResume }: PosHoldListProps) {
  return (
    <section className="space-y-2 border border-line bg-surface p-3" aria-label="Held bills">
      <h2 className="text-sm font-semibold text-ink">Held bills</h2>
      {loading ? <p className="text-sm text-muted">Loading held bills…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="text-sm text-muted">No held bills on this till.</p>
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-ink">{item.invoiceNumber}</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => onResume(item.id)}
                disabled={busy}
              >
                Resume bill {item.invoiceNumber}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
