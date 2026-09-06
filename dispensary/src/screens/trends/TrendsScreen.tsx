import { TrendsEmptyState } from './components/trends-empty-state';
import { TrendsFilterBar } from './components/trends-filter-bar';
import { TrendsFrequency } from './components/trends-frequency';
import { TrendsHeader } from './components/trends-header';
import { TrendsSalesChart } from './components/trends-sales-chart';
import { TrendsSlowDead } from './components/trends-slow-dead';
import { TrendsStatusBanner } from './components/trends-status-banner';
import { TrendsSummaryStrip } from './components/trends-summary-strip';
import { TrendsTopSellers } from './components/trends-top-sellers';
import { useTrendsPage } from './useTrendsPage';

export default function TrendsScreen() {
  const page = useTrendsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <TrendsHeader planGate={page.planGate} />
      <TrendsStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
        planGate={page.planGate}
      />
      {page.allowed && !page.planGate ? (
        <>
          <TrendsFilterBar
            compare={page.compare}
            owner={page.owner}
            scope={page.scope}
            disabled={page.busy}
            applyRef={page.applyRef}
            onCompare={page.onCompare}
            onScope={page.onScope}
            onApply={page.onApply}
          />
          {page.status === 'success' && page.view ? (
            <>
              <TrendsSummaryStrip view={page.view} />
              <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
                <TrendsSalesChart view={page.view} />
                <TrendsTopSellers items={page.view.topSellers} />
                <TrendsSlowDead items={page.view.slowDeadStock} />
                <TrendsFrequency items={page.view.customerFrequency} />
              </div>
            </>
          ) : null}
          {page.status === 'empty' ? <TrendsEmptyState /> : null}
        </>
      ) : null}
    </div>
  );
}
