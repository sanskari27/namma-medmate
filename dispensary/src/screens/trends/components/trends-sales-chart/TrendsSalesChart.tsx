import { AreaMetricChart } from '@molecules/area-metric-chart';
import type { AnalyticsView } from '@/services/analytics';
import { formatPaise } from '../../TrendsScreen.utils';

export function TrendsSalesChart({ view }: { view: AnalyticsView }) {
  const data = view.salesTrend.points.map((point) => ({
    label: point.date.slice(8),
    value: point.currentPaise / 100,
  }));
  return (
    <section className="border border-line bg-surface p-3" aria-labelledby="compare-sales-trend">
      <h2 id="compare-sales-trend" className="text-sm font-semibold text-ink">
        Collected by day
      </h2>
      <p className="mt-1 text-sm text-muted">
        This window {formatPaise(view.current.salesPaise)} against last window{' '}
        {formatPaise(view.prior.salesPaise)}.
      </p>
      <div className="mt-2">
        <AreaMetricChart data={data} emptyLabel="No completed bills to plot for this window." />
      </div>
    </section>
  );
}
