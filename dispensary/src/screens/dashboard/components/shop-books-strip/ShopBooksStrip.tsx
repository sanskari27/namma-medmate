import { Link } from 'react-router-dom';
import type { AgingPayload, DashboardWidget, OwnerDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { formatPaise } from '../../DashboardScreen.utils';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopBooksStripProps = {
  receivables?: DashboardWidget<AgingPayload> | null;
  payables?: DashboardWidget<AgingPayload> | null;
  sources?: OwnerDesk['sources'];
};

export function ShopBooksStrip({ receivables, payables, sources }: ShopBooksStripProps) {
  return (
    <>
      <ShopWidgetFrame
        title="Khata"
        asOf={receivables?.asOf}
        status={receivables?.status}
        href={receivables?.href ?? '/aging'}
        linkLabel="Khata dues"
        error={receivables?.error}
      >
        <p className="mt-2 text-sm text-muted">
          Patients owe us{' '}
          <span className="font-mono tabular-nums text-ink">
            {receivables?.data ? formatPaise(receivables.data.totalPaise) : '—'}
          </span>
        </p>
      </ShopWidgetFrame>
      <ShopWidgetFrame
        title="Stockist dues"
        asOf={payables?.asOf}
        status={payables?.status}
        href={payables?.href ?? '/aging'}
        linkLabel="Stockist dues"
        error={payables?.error}
      >
        <p className="mt-2 text-sm text-muted">
          We owe stockists{' '}
          <span className="font-mono tabular-nums text-ink">
            {payables?.data ? formatPaise(payables.data.totalPaise) : '—'}
          </span>
        </p>
      </ShopWidgetFrame>
      {sources?.expenses ? (
        <p className="border-b border-line bg-surface px-3 py-2 text-sm last:border-b-0">
          <Link className="text-brand underline-offset-2 hover:underline" to={ROUTES.EXPENSES}>
            Shop spend
          </Link>
        </p>
      ) : null}
    </>
  );
}
