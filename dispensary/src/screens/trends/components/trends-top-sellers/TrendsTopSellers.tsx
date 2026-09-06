import { BarMetricChart } from '@molecules/bar-metric-chart';
import type { AnalyticsView } from '@/services/analytics';
import { formatPaise } from '../../TrendsScreen.utils';

export function TrendsTopSellers({ items }: { items: AnalyticsView['topSellers'] }) {
  return (
    <section className="border border-line bg-surface p-3" aria-labelledby="compare-top-sellers">
      <h2 id="compare-top-sellers" className="text-sm font-semibold text-ink">
        Top packs this window
      </h2>
      <p className="mt-1 text-sm text-muted">
        {items[0]
          ? `${items[0].name} led with ${formatPaise(items[0].salesPaise)}.`
          : 'No pack led this window.'}
      </p>
      <div className="mt-2">
        <BarMetricChart
          data={items.map((item) => ({ label: item.name, value: item.salesPaise / 100 }))}
          emptyLabel="No top packs in this window."
        />
      </div>
      {items[0] ? (
        <p className="mt-2 text-sm text-ink">
          {items[0].name} · {items[0].units} units
        </p>
      ) : null}
    </section>
  );
}
