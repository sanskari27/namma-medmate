import type { CountItemsPayload, DashboardWidget, TopProductItem } from '@/services/dashboards';
import { formatPaise, formatQty } from '../../DashboardScreen.utils';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopMoversStripProps = {
  widget?: DashboardWidget<CountItemsPayload<TopProductItem>> | null;
};

export function ShopMoversStrip({ widget }: ShopMoversStripProps) {
  const items = widget?.data?.items ?? [];
  return (
    <ShopWidgetFrame
      title="Top movers today"
      asOf={widget?.asOf}
      status={widget?.status}
      href={widget?.href ?? '/pos'}
      linkLabel="Today's movers"
    >
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No completed lines today.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1 font-medium">Medicine</th>
              <th className="py-1 font-medium">Qty</th>
              <th className="py-1 font-medium">Sales</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.productId} className="border-b border-line last:border-0">
                <td className="py-1 text-ink">{row.productName}</td>
                <td className="py-1 font-mono tabular-nums text-ink">{formatQty(row.quantity)}</td>
                <td className="py-1 font-mono tabular-nums text-ink">
                  {formatPaise(row.salesPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ShopWidgetFrame>
  );
}
