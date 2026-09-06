import { Link } from 'react-router-dom';
import type { InventoryDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatQty } from '../../DashboardScreen.utils';

export type StockDeskPanelProps = {
  data: InventoryDesk | null | undefined;
};

export function StockDeskPanel({ data }: StockDeskPanelProps) {
  const low = data?.lowStock ?? [];
  const transfers = data?.pendingTransfers ?? [];
  const grn = data?.pendingGrn ?? [];
  return (
    <section className="min-h-48 space-y-px border border-line bg-line">
      <div className="bg-surface px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Low stock</h2>
        {low.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No lines below reorder on this outlet.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1 font-medium">Medicine</th>
                <th className="py-1 font-medium">On hand</th>
                <th className="py-1 font-medium">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {low.map((row) => (
                <tr key={row.productId} className="border-b border-line last:border-0">
                  <td className="py-1 text-ink">
                    <span className="font-mono text-xs text-muted">{row.sku}</span>{' '}
                    {row.productName}
                  </td>
                  <td className="py-1 font-mono tabular-nums text-ink">{formatQty(row.onHand)}</td>
                  <td className="py-1 font-mono tabular-nums text-muted">
                    {row.reorderLevel ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-surface px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Transfers waiting</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No requested or in-transit moves.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {transfers.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 font-mono text-ink">
                <span>{row.status}</span>
                <span className="text-muted">{row.direction}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-surface px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Deliveries to check</h2>
        {grn.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No deliveries waiting on a pharmacist check.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {grn.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 text-ink">
                <span className="font-mono">{row.receiptNumber}</span>
                <span className="font-mono text-xs text-muted">{row.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="flex gap-4 bg-surface px-3 py-2 text-sm">
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.INVENTORY}>
          Stock book
        </Link>
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.PURCHASES}>
          Deliveries
        </Link>
      </p>
    </section>
  );
}
