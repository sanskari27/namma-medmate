import { Link } from 'react-router-dom';
import type { OwnerDesk } from '@/services/dashboards';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { formatPaise } from '../../DashboardScreen.utils';

export type DashboardOwnerWidgetsProps = {
  owner: OwnerDesk;
};

function widgetValue(
  status: string | undefined,
  ok: string,
): { text: string; href: string } {
  if (status === 'FAILED') {
    return { text: DASHBOARD_CONTENT.unavailable, href: ROUTES.DASHBOARD };
  }
  if (status === 'PLAN_LIMIT') {
    return { text: DASHBOARD_CONTENT.upgradePlan, href: ROUTES.SUBSCRIPTION };
  }
  return { text: ok, href: ROUTES.DASHBOARD };
}

export function DashboardOwnerWidgets({ owner }: DashboardOwnerWidgetsProps) {
  const payables = widgetValue(
    owner.payables?.status,
    formatPaise(owner.payablesTotalPaise ?? 0),
  );
  const transfers = widgetValue(
    owner.transfers?.status,
    String(owner.transfers?.data?.count ?? 0),
  );
  const licences = widgetValue(
    owner.compliance?.status,
    String(owner.compliance?.data?.licenseDueCount ?? 0),
  );
  const openPos = widgetValue(
    owner.openPurchaseOrders?.status,
    String(owner.openPurchaseOrders?.data?.count ?? 0),
  );
  const approvals = widgetValue(
    owner.approvals?.status,
    String(owner.approvals?.data?.count ?? 0),
  );

  const cells = [
    {
      label: DASHBOARD_CONTENT.widgetPayables,
      value: payables.text,
      href: owner.payables?.href || owner.sources.aging || ROUTES.AGING,
      gated: owner.payables?.status === 'PLAN_LIMIT' || owner.payables?.status === 'FAILED',
      fallback: payables.href,
    },
    {
      label: DASHBOARD_CONTENT.widgetTransfers,
      value: transfers.text,
      href: owner.transfers?.href || ROUTES.INVENTORY,
      gated: owner.transfers?.status === 'PLAN_LIMIT' || owner.transfers?.status === 'FAILED',
      fallback: transfers.href,
    },
    {
      label: DASHBOARD_CONTENT.widgetLicences,
      value: licences.text,
      href: owner.compliance?.href || ROUTES.LICENSES,
      gated: owner.compliance?.status === 'PLAN_LIMIT' || owner.compliance?.status === 'FAILED',
      fallback: licences.href,
    },
    {
      label: DASHBOARD_CONTENT.widgetOpenPos,
      value: openPos.text,
      href: owner.openPurchaseOrders?.href || ROUTES.PURCHASES,
      gated: owner.openPurchaseOrders?.status === 'PLAN_LIMIT' || owner.openPurchaseOrders?.status === 'FAILED',
      fallback: openPos.href,
    },
    {
      label: DASHBOARD_CONTENT.widgetApprovals,
      value: approvals.text,
      href: owner.approvals?.href || ROUTES.APPROVALS_PENDING,
      gated: owner.approvals?.status === 'PLAN_LIMIT' || owner.approvals?.status === 'FAILED',
      fallback: approvals.href,
    },
  ];

  return (
    <section className="dash-card" aria-label={DASHBOARD_CONTENT.ownerGlance} style={{ marginBottom: 16 }}>
      <div className="dash-card-head">
        <div>
          <h2>{DASHBOARD_CONTENT.ownerGlance}</h2>
        </div>
      </div>
      <div className="dash-stats dash-desk-stats">
        {cells.map((cell) => (
          <p className="dash-stat" key={cell.label}>
            <span className="lbl">{cell.label}</span>
            <Link className="val" to={cell.gated ? cell.fallback : cell.href}>
              {cell.value}
            </Link>
          </p>
        ))}
      </div>
    </section>
  );
}
