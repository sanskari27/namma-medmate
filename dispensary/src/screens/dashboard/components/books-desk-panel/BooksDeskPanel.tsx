import { Link } from 'react-router-dom';
import type { AccountantDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatPaise } from '../../DashboardScreen.utils';

export type BooksDeskPanelProps = {
  data: AccountantDesk | null | undefined;
};

export function BooksDeskPanel({ data }: BooksDeskPanelProps) {
  return (
    <section className="min-h-48 border border-line bg-surface">
      <dl className="grid gap-px border-b border-line bg-line sm:grid-cols-3">
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Patients owe us</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? formatPaise(data.receivablesTotalPaise) : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">We owe stockists</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? formatPaise(data.payablesTotalPaise) : '—'}
          </dd>
        </div>
        <div className="bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Spend posted</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">
            {data ? formatPaise(data.expenseTotalPaise) : '—'}
          </dd>
        </div>
      </dl>
      {data && data.receivableBuckets.length > 0 ? (
        <ul className="flex flex-wrap gap-3 border-b border-line px-3 py-2 text-sm text-muted">
          {data.receivableBuckets.map((bucket) => (
            <li key={bucket.key}>
              {bucket.label}{' '}
              <span className="font-mono tabular-nums text-ink">{formatPaise(bucket.totalPaise)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="flex gap-4 px-3 py-2 text-sm">
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
