import type { PurchaseOrderAnalytics } from '@/services/purchaseOrders';
import { formatPaise } from '../../PurchasesScreen.utils';

export type StockistSpendPanelProps = {
  analytics: PurchaseOrderAnalytics | null;
  status: 'loading' | 'empty' | 'denied' | 'failure' | null;
};

export function StockistSpendPanel({ analytics, status }: StockistSpendPanelProps) {
  const text =
    status === 'loading'
      ? 'Loading stockist spend…'
      : status === 'empty'
        ? 'No issued or closed spend on this outlet yet.'
        : status === 'denied'
          ? 'Stockist spend sits on Pro.'
          : status === 'failure'
            ? 'Could not load stockist spend. Try again.'
            : null;

  return (
    <section aria-label="Stockist spend" className="border border-line bg-surface">
      <header className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Stockist spend</h2>
        <p className="text-xs text-muted">Issued and closed indents on this outlet, in paise.</p>
      </header>
      {text ? (
        <p role="status" className="px-3 py-3 text-sm text-muted">
          {text}
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Spend by stockist</caption>
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Stockist</th>
              <th className="px-3 py-2 font-medium">Indents</th>
              <th className="px-3 py-2 font-medium">Spend</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.suppliers.map((row) => (
              <tr key={row.supplierId} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 text-ink">{row.supplierLegalName}</td>
                <td className="px-3 py-2 font-mono text-muted">{row.orderCount}</td>
                <td className="px-3 py-2 font-mono text-ink">{formatPaise(row.spendPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="px-3 py-2 text-ink" scope="row">
                Outlet total
              </th>
              <td />
              <td className="px-3 py-2 font-mono text-ink">
                {formatPaise(analytics?.totalSpendPaise ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}
