import { copyrightNotice } from '@/libs/constants/brand.const';
import { DashboardAccountantDesk } from './components/dashboard-accountant-desk';
import { DashboardCashierDesk } from './components/dashboard-cashier-desk';
import { DashboardDeskSwitch } from './components/dashboard-desk-switch';
import { DashboardHero } from './components/dashboard-hero';
import { DashboardInventoryDesk } from './components/dashboard-inventory-desk';
import { DashboardKpiRow } from './components/dashboard-kpi-row';
import { DashboardLists } from './components/dashboard-lists';
import { DashboardRecentTransactions } from './components/dashboard-recent-transactions';
import { DashboardSalesAnalytics } from './components/dashboard-sales-analytics';
import { DashboardSplitCards } from './components/dashboard-split-cards';
import { DashboardOwnerWidgets } from './components/dashboard-owner-widgets';
import { DashboardStatusBanner } from './components/dashboard-status-banner';
import { useDashboardScreen } from './useDashboardScreen';
import './DashboardScreen.css';

export default function DashboardScreen() {
  const page = useDashboardScreen();
  const roleDesk = page.deskView;

  return (
    <div className="dash">
      <DashboardStatusBanner
        status={page.status}
        desk={page.desk}
        statusId={page.statusId}
        hint={page.statusHint}
        onRefresh={page.onRefresh}
        busy={page.busy}
      />
      {page.status === 'denied' ? null : (
        <>
          <DashboardDeskSwitch
            desks={page.desks}
            current={page.desk}
            onSelect={page.onDesk}
            busy={page.busy}
          />
          {page.view ? (
            <>
              <DashboardHero displayName={page.displayName} view={page.view} />
              <DashboardKpiRow view={page.view} />
              {page.view.owner ? <DashboardOwnerWidgets owner={page.view.owner} /> : null}
              <DashboardSalesAnalytics
                analytics={page.view.analytics}
                period={page.period}
                metric={page.metric}
                chartType={page.chartType}
                busy={page.busy}
                onPeriod={page.onPeriod}
                onMetric={page.onMetric}
                onChartType={page.onChartType}
              />
              {page.view.analytics.status === 'PLAN_LIMIT' ? null : (
                <DashboardSplitCards analytics={page.view.analytics} />
              )}
              <DashboardLists view={page.view} />
              <DashboardRecentTransactions items={page.view.recentTransactions} />
              <p className="dash-copyright">{copyrightNotice()}</p>
            </>
          ) : null}
          {roleDesk?.cashier ? <DashboardCashierDesk desk={roleDesk.cashier} /> : null}
          {roleDesk?.inventory ? <DashboardInventoryDesk desk={roleDesk.inventory} /> : null}
          {roleDesk?.accountant ? <DashboardAccountantDesk desk={roleDesk.accountant} /> : null}
        </>
      )}
    </div>
  );
}
