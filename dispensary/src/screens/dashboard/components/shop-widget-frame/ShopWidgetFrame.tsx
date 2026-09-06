import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { formatAsOf } from '../../DashboardScreen.utils';

export type ShopWidgetFrameProps = {
  title: string;
  asOf?: string | null;
  status?: string | null;
  href?: string | null;
  linkLabel: string;
  children: ReactNode;
};

export function ShopWidgetFrame({
  title,
  asOf,
  status,
  href,
  linkLabel,
  children,
}: ShopWidgetFrameProps) {
  const failed = status === 'FAILED';
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
      ) : (
        children
      )}
      {href ? (
        <p className="mt-2 text-sm">
          <Link className="text-brand underline-offset-2 hover:underline" to={href}>
            {linkLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
