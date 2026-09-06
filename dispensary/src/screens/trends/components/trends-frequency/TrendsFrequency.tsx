import { BarMetricChart } from '@molecules/bar-metric-chart';
import type { AnalyticsView } from '@/services/analytics';
import { frequencyLabel } from '../../TrendsScreen.utils';

export function TrendsFrequency({ items }: { items: AnalyticsView['customerFrequency'] }) {
  return (
    <section className="border border-line bg-surface p-3" aria-labelledby="compare-frequency">
      <h2 id="compare-frequency" className="text-sm font-semibold text-ink">
        How often patients buy
      </h2>
      <p className="mt-1 text-sm text-muted">
        Walk-in vs regulars in this window, from completed bills.
      </p>
      <ul className="mt-2 text-sm text-ink">
        {items.map((item) => (
          <li key={item.bucket}>
            {frequencyLabel(item.bucket)}: {item.currentCount}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <BarMetricChart
          data={items.map((item) => ({
            label: frequencyLabel(item.bucket),
            value: item.currentCount,
          }))}
          emptyLabel="No patient visits in this window."
        />
      </div>
    </section>
  );
}
