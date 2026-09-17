import {
  AlertTriangle,
  Check,
  ClipboardList,
  IndianRupee,
  Package,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { KeyboardEvent } from 'react';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { formatPaise, salesTrendPct } from '../../DashboardScreen.utils';
import { DashboardSparkline } from '../dashboard-sparkline';

export type DashboardKpiRowProps = {
  view: HomeDashboardView;
};

function activateOnKey(
  event: KeyboardEvent,
  navigate: ReturnType<typeof useNavigate>,
  path: string,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navigate(path);
  }
}

export function DashboardKpiRow({ view }: DashboardKpiRowProps) {
  const navigate = useNavigate();
  const { kpis, analytics } = view;
  const sparkValues = analytics.trend.map((point) => point.salesPaise / 100);
  const trendPct = salesTrendPct(kpis.todaySalesPaise, kpis.yesterdaySalesPaise);

  return (
    <section className="dash-stats" aria-label={DASHBOARD_CONTENT.regionKpis}>
      <div
        className="dash-stat link kpi accent-green"
        role="button"
        tabIndex={0}
        title={DASHBOARD_CONTENT.titleViewSales}
        onClick={() => navigate(ROUTES.ORDERS)}
        onKeyDown={(event) => activateOnKey(event, navigate, ROUTES.ORDERS)}
      >
        <div className="dash-kpi-top">
          <span className="ic ic-green" aria-hidden="true">
            <IndianRupee size={19} />
          </span>
          {trendPct != null && trendPct !== 0 ? (
            <span className={`dash-trend ${trendPct >= 0 ? 'up' : 'down'}`}>
              {trendPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trendPct)}%
            </span>
          ) : null}
        </div>
        <div className="lbl">{DASHBOARD_CONTENT.kpiTodaySales}</div>
        <div className="val">{formatPaise(kpis.todaySalesPaise)}</div>
        <div className="split">
          <span className="dt">
            <Store size={11} aria-hidden="true" /> {formatPaise(kpis.todayCounterSalesPaise)}
          </span>
        </div>
        <DashboardSparkline values={sparkValues} tone="green" />
      </div>

      <div
        className="dash-stat link kpi accent-blue"
        role="button"
        tabIndex={0}
        title={DASHBOARD_CONTENT.titleViewOrders}
        onClick={() => navigate(ROUTES.ORDERS)}
        onKeyDown={(event) => activateOnKey(event, navigate, ROUTES.ORDERS)}
      >
        <div className="dash-kpi-top">
          <span className="ic ic-blue" aria-hidden="true">
            <Package size={19} />
          </span>
          {kpis.newHeldBillCount > 0 ? (
            <span className="dash-trend gold">
              {kpis.newHeldBillCount} {DASHBOARD_CONTENT.kpiNewSuffix}
            </span>
          ) : null}
        </div>
        <div className="lbl">{DASHBOARD_CONTENT.kpiOrdersToday}</div>
        <div className="val">{kpis.todayBillCount}</div>
        <div className="split">
          {kpis.heldBillCount > 0 ? (
            <>
              <b style={{ color: 'var(--dash-gold)' }}>{kpis.heldBillCount}</b>{' '}
              {DASHBOARD_CONTENT.kpiAwaitingAction}
            </>
          ) : (
            <>
              <Check size={12} aria-hidden="true" /> {DASHBOARD_CONTENT.kpiAllCaughtUp}
            </>
          )}
        </div>
      </div>

      <div
        className="dash-stat link kpi accent-gold"
        role="button"
        tabIndex={0}
        title={DASHBOARD_CONTENT.titleReviewPrescriptions}
        onClick={() => navigate(ROUTES.PRESCRIPTIONS)}
        onKeyDown={(event) => activateOnKey(event, navigate, ROUTES.PRESCRIPTIONS)}
      >
        <div className="dash-kpi-top">
          <span className="ic ic-gold" aria-hidden="true">
            <ClipboardList size={19} />
          </span>
          {kpis.pendingPrescriptions > 0 ? (
            <span className="dash-badge gold">{DASHBOARD_CONTENT.kpiToVerify}</span>
          ) : null}
        </div>
        <div className="lbl">{DASHBOARD_CONTENT.kpiPrescriptions}</div>
        <div className="val">{kpis.pendingPrescriptions}</div>
        <div className="split">{DASHBOARD_CONTENT.kpiPendingReview}</div>
      </div>

      <div
        className="dash-stat link kpi accent-rose"
        role="button"
        tabIndex={0}
        title={DASHBOARD_CONTENT.titleOpenInventory}
        onClick={() => navigate(`${ROUTES.INVENTORY}?view=guidance`)}
        onKeyDown={(event) =>
          activateOnKey(event, navigate, `${ROUTES.INVENTORY}?view=guidance`)
        }
      >
        <div className="dash-kpi-top">
          <span className="ic ic-rose" aria-hidden="true">
            <AlertTriangle size={19} />
          </span>
          {kpis.stockAlertCount > 0 ? (
            <span className="dash-badge rose">{DASHBOARD_CONTENT.kpiAction}</span>
          ) : null}
        </div>
        <div className="lbl">{DASHBOARD_CONTENT.kpiStockAlerts}</div>
        <div className="val">{kpis.stockAlertCount}</div>
        <div className="split">
          <span className="dt">
            <b>{kpis.lowStockCount}</b> {DASHBOARD_CONTENT.kpiLow}
          </span>
          <span className="dt">
            <b>{kpis.expiringCount}</b> {DASHBOARD_CONTENT.kpiExpiring}
          </span>
        </div>
      </div>
    </section>
  );
}
