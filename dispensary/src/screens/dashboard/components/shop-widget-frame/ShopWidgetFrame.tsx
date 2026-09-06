import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatAsOf } from '../../DashboardScreen.utils';

export type ShopWidgetFrameProps = {
  title: string;
  asOf?: string | null;
  status?: string | null;
  href?: string | null;
  linkLabel: string;
  error?: string | null;
  children: ReactNode;
};

export function ShopWidgetFrame({
  title,
  asOf,
  status,
  href,
  linkLabel,
  error,
  children,
}: ShopWidgetFrameProps) {
  const failed = status === 'FAILED';
  const planGate = status === 'PLAN_LIMIT';
  return (
    <section className="border-b border-line bg-surface px-3 py-2 last:border-b-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        <p className="font-mono text-xs text-muted">As of {formatAsOf(asOf)}</p>
      </header>
      {failed ? (
        <p className="mt-2 text-sm text-danger" role="status">
          Could not load this strip.
        </p>
      ) : planGate ? (
        <p className="mt-2 text-sm text-ink" role="status">
          {error ?? 'Khata and stockist aging is on Growth. Open the plan to turn it on.'}{' '}
          <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.SUBSCRIPTION}>
            Open the plan
          </Link>
        </p>
      ) : (
        children
      )}
      {href && !planGate ? (
        <p className="mt-2 text-sm">
          <Link className="text-brand underline-offset-2 hover:underline" to={href}>
            {linkLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
