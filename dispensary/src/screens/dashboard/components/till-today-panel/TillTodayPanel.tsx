import { Link } from 'react-router-dom';
import type { CashierDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatHeldAt, formatPaise } from '../../DashboardScreen.utils';

export type TillTodayPanelProps = {
  data: CashierDesk | null | undefined;
};

export function TillTodayPanel({ data }: TillTodayPanelProps) {
  const holds = data?.holds ?? [];
  return (
    <section className="min-h-48 border border-line bg-surface">
      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line">
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
      </dl>
      <div className="px-3 py-2">
        <h2 className="text-sm font-medium text-ink">Held bills</h2>
        {holds.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No held bills on this till.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1 font-medium">Bill</th>
                <th className="py-1 font-medium">Amount</th>
                <th className="py-1 font-medium">Held</th>
              </tr>
            </thead>
            <tbody>
              {holds.map((hold) => (
                <tr key={hold.id} className="border-b border-line last:border-0">
                  <td className="py-1 font-mono text-ink">{hold.invoiceNumber}</td>
                  <td className="py-1 font-mono tabular-nums text-ink">
                    {formatPaise(hold.totalPaise)}
                  </td>
                  <td className="py-1 text-muted">{formatHeldAt(hold.heldAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-line px-3 py-2 text-sm">
        <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.SALES}>
          Open till
        </Link>
      </p>
    </section>
  );
}
