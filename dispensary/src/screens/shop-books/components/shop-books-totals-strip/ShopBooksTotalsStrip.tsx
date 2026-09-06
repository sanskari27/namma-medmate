import type { FinanceReportTotal } from '@/services/financeReports';
import { formatPaise } from '../../ShopBooksScreen.utils';

export type ShopBooksTotalsStripProps = {
  totals: FinanceReportTotal[];
  allOutlets: boolean;
};

export function ShopBooksTotalsStrip({ totals, allOutlets }: ShopBooksTotalsStripProps) {
  if (totals.length === 0) {
    return <div className="min-h-10" aria-hidden />;
  }
  return (
    <section
      aria-label="Reconciliation totals"
      className="overflow-x-auto border border-line bg-surface"
    >
      <p className="border-b border-line px-3 py-1.5 text-xs text-muted">
        {allOutlets ? 'All outlets' : 'This outlet'}
      </p>
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {totals.map((total) => (
          <div key={total.key} className="bg-surface px-3 py-2">
            <dt className="text-xs text-muted">{total.label}</dt>
            <dd className="font-mono text-sm font-medium tabular-nums text-ink">
              {formatPaise(total.amountPaise)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
