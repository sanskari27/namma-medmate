import { copyrightNotice } from '@/libs/constants/brand.const';
import { DashboardHero } from './components/dashboard-hero';
import { DashboardKpiRow } from './components/dashboard-kpi-row';
import { DashboardLists } from './components/dashboard-lists';
import { DashboardRecentTransactions } from './components/dashboard-recent-transactions';
import { DashboardSalesAnalytics } from './components/dashboard-sales-analytics';
import { DashboardSplitCards } from './components/dashboard-split-cards';
import { DashboardStatusBanner } from './components/dashboard-status-banner';
import { useDashboardScreen } from './useDashboardScreen';
import './DashboardScreen.css';

export default function DashboardScreen() {
  const page = useDashboardScreen();

  return (
    <div className="dash">
      <DashboardStatusBanner
        status={page.status}
        desk={null}
        statusId={page.statusId}
        hint={page.statusHint}
        onRefresh={page.onRefresh}
        busy={page.busy}
      />
      {page.status === 'denied' || !page.view ? null : (
        <>
          <DashboardHero displayName={page.displayName} view={page.view} />
          <DashboardKpiRow view={page.view} />
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
          <DashboardSplitCards analytics={page.view.analytics} />
          <DashboardLists view={page.view} />
          <DashboardRecentTransactions items={page.view.recentTransactions} />
          <p className="dash-copyright">{copyrightNotice()}</p>
        </>
      )}
    </div>
  );
}
