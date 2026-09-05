import { Button } from '@atoms';
import type { InvoiceOfferItem, SalesInvoice } from '@/services/salesInvoices';

interface PosOfferPanelProps {
  items: InvoiceOfferItem[];
  loading: boolean;
  busy: boolean;
  invoice: SalesInvoice | null;
  onApply: () => void;
}

export function PosOfferPanel({ items, loading, busy, invoice, onApply }: PosOfferPanelProps) {
  const explanations = invoice?.lines
    .map((line) => line.offerExplanation)
    .filter((value): value is string => Boolean(value));

  return (
    <section
      className="space-y-2 border border-line bg-surface p-3"
      aria-label="Schemes on this bill"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">On this bill</h2>
        <Button type="button" variant="outline" onClick={onApply} disabled={busy}>
          Apply scheme
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted">Loading schemes on this bill…</p> : null}
      {!loading && invoice && items.length === 0 ? (
        <p className="text-sm text-muted">No live scheme fits this bill.</p>
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-ink">{item.name}</span>
              <span className="font-mono text-xs text-muted">{item.kind}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {explanations && explanations.length > 0 ? (
        <ul className="space-y-1">
          {explanations.map((text) => (
            <li key={text} className="text-sm text-muted">
              {text}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
