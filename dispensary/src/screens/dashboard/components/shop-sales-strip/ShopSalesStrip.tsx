import type { DashboardWidget, SalesPayload } from '@/services/dashboards';
import { formatPaise } from '../../DashboardScreen.utils';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopSalesStripProps = {
  widget?: DashboardWidget<SalesPayload> | null;
};

export function ShopSalesStrip({ widget }: ShopSalesStripProps) {
  const data = widget?.data;
  const branches = data?.branches ?? [];
  return (
    <ShopWidgetFrame
      title="Collected today"
      asOf={widget?.asOf}
      status={widget?.status}
      href={widget?.href ?? '/pos'}
      linkLabel="Open till"
    >
      <p className="mt-2 font-mono text-lg tabular-nums text-ink">
        {data ? formatPaise(data.todaySalesPaise) : '—'}
        <span className="ml-2 text-sm text-muted">
          {data ? `${data.todayBillCount} ${data.todayBillCount === 1 ? 'bill' : 'bills'}` : ''}
        </span>
      </p>
      {branches.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No outlet figures in this view.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-1 font-medium">Outlet</th>
              <th className="py-1 font-medium">Today</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id} className="border-b border-line last:border-0">
                <td className="py-1 text-ink">{branch.name}</td>
                <td className="py-1 font-mono tabular-nums text-ink">
                  {formatPaise(branch.todaySalesPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ShopWidgetFrame>
  );
}
