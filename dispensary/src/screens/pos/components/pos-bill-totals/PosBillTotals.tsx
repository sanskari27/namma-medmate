import { formatPaise, type BillTotals } from '../../PosScreen.utils';

interface PosBillTotalsProps {
  totals: BillTotals;
  saved: boolean;
}

export function PosBillTotals({ totals, saved }: PosBillTotalsProps) {
  return (
    <section
      className="space-y-2 rounded border border-line bg-surface p-3"
      aria-label="Bill totals"
    >
      <h2 className="text-sm font-semibold text-ink">
        {saved ? 'Saved draft totals' : 'Bill preview'}
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Taxable</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.subtotalPaise)}</dd>
        <dt className="text-muted">Discount</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.discountPaise)}</dd>
        <dt className="text-muted">GST</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.taxPaise)}</dd>
        <dt className="text-muted">Grand total</dt>
        <dd className="font-mono tabular-nums font-semibold text-ink">
          {formatPaise(totals.totalPaise)}
        </dd>
      </dl>
    </section>
  );
}
