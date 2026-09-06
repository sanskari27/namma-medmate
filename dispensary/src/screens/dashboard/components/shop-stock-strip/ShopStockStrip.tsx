import type {
  CountItemsPayload,
  DashboardWidget,
  ExpiryItem,
  LowStockItem,
} from '@/services/dashboards';
import { formatDay, formatQty } from '../../DashboardScreen.utils';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopStockStripProps = {
  lowStock?: DashboardWidget<CountItemsPayload<LowStockItem>> | null;
  expiry?: DashboardWidget<CountItemsPayload<ExpiryItem>> | null;
};

export function ShopStockStrip({ lowStock, expiry }: ShopStockStripProps) {
  const short = lowStock?.data?.items ?? [];
  const near = expiry?.data?.items ?? [];
  return (
    <>
      <ShopWidgetFrame
        title="Short on this outlet"
        asOf={lowStock?.asOf}
        status={lowStock?.status}
        href={lowStock?.href ?? '/inventory'}
        linkLabel="Stock book"
      >
        {short.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No lines below reorder in this view.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1 font-medium">Medicine</th>
                <th className="py-1 font-medium">On hand</th>
                <th className="py-1 font-medium">Reorder</th>
                <th className="py-1 font-medium">Outlet</th>
              </tr>
            </thead>
            <tbody>
              {short.map((row) => (
                <tr key={`${row.branchId ?? 'x'}-${row.productId}`} className="border-b border-line last:border-0">
                  <td className="py-1 text-ink">
                    <span className="font-mono text-xs text-muted">{row.sku}</span> {row.productName}
                  </td>
                  <td className="py-1 font-mono tabular-nums text-ink">{formatQty(row.onHand)}</td>
                  <td className="py-1 font-mono tabular-nums text-muted">
                    {row.reorderLevel ?? '—'}
                  </td>
                  <td className="py-1 text-muted">{row.branchName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ShopWidgetFrame>
      <ShopWidgetFrame
        title="Near expiry"
        asOf={expiry?.asOf}
        status={expiry?.status}
        href={expiry?.href ?? '/inventory'}
        linkLabel="Near expiry"
      >
        {near.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No batches in the warning window.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1 font-medium">Medicine</th>
                <th className="py-1 font-medium">Batch</th>
                <th className="py-1 font-medium">Expires</th>
                <th className="py-1 font-medium">Outlet</th>
              </tr>
            </thead>
            <tbody>
              {near.map((row) => (
                <tr key={`${row.branchId ?? 'x'}-${row.productId}-${row.batchNumber}`} className="border-b border-line last:border-0">
                  <td className="py-1 text-ink">{row.productName}</td>
                  <td className="py-1 font-mono text-ink">{row.batchNumber}</td>
                  <td className="py-1 font-mono text-muted">{formatDay(row.expiresOn)}</td>
                  <td className="py-1 text-muted">{row.branchName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ShopWidgetFrame>
    </>
  );
}
