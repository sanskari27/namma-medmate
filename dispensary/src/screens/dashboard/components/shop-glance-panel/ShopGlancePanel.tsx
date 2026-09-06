import { Link } from 'react-router-dom';
import type { OwnerDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatPaise } from '../../DashboardScreen.utils';

export type ShopGlancePanelProps = {
  data: OwnerDesk | null | undefined;
};

export function ShopGlancePanel({ data }: ShopGlancePanelProps) {
  const branches = data?.branches ?? [];
  return (
    <section className="min-h-48 border border-line bg-surface">
      <dl className="grid gap-px border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Collected today</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? formatPaise(data.todaySalesPaise) : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Bills completed</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? data.todayBillCount : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Low stock lines</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? data.lowStockCount : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Spend posted</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? formatPaise(data.expenseTotalPaise) : '—'}
          </dd>
        </div>
      </dl>
      <dl className="grid gap-px border-b border-line bg-line sm:grid-cols-2">
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Patients owe us</dt>
          <dd className="font-mono tabular-nums text-ink">
            {data ? formatPaise(data.receivablesTotalPaise) : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">We owe stockists</dt>
          <dd className="font-mono tabular-nums text-ink">
            {data ? formatPaise(data.payablesTotalPaise) : '—'}
          </dd>
        </div>
      </dl>
      <div className="px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Outlet takings today</h2>
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
      </div>
      <p className="flex flex-wrap gap-4 border-t border-line px-3 py-2 text-sm">
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.SALES}>
          Open till
        </Link>
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.INVENTORY}>
          Stock book
        </Link>
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.AGING}>
          Khata dues
        </Link>
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.EXPENSES}>
          Shop spend
        </Link>
      </p>
    </section>
  );
}
