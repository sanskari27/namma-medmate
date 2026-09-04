import type { OutstandingCreditAccount } from '@/services/credit';
import { formatPaise } from '@/services/credit';

export type CreditListPanelProps = {
  items: OutstandingCreditAccount[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (customerId: string) => void;
};

export function CreditListPanel({ items, selectedId, loading, onSelect }: CreditListPanelProps) {
  return (
    <section
      aria-label="Outstanding khata list"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <div className="border-b border-line px-3 py-2">
        <h2 className="font-sans text-sm font-semibold text-ink">Outstanding</h2>
      </div>
      {loading ? (
        <p className="px-3 py-4 text-sm text-muted" role="status">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No dues to collect.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-auto">
          {items.map((row) => {
            const selected = row.customerId === selectedId;
            return (
              <li key={row.customerId} className="border-b border-line">
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
                    selected ? 'bg-brand-soft' : 'hover:bg-canvas'
                  }`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(row.customerId)}
                >
                  <span className="font-medium text-ink">{row.customerName}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {row.customerPhone} · due {formatPaise(row.balancePaise)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
