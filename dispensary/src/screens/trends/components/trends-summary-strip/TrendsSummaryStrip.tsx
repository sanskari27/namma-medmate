import type { AnalyticsView } from '@/services/analytics';
import { formatPaise } from '../../TrendsScreen.utils';

export function TrendsSummaryStrip({ view }: { view: AnalyticsView }) {
  return (
    <dl
      className="grid grid-cols-2 gap-3 border border-line bg-surface px-3 py-2 text-sm sm:grid-cols-4"
      aria-label="This week vs last week"
    >
      <div>
        <dt className="text-muted">Collected this week</dt>
        <dd className="font-medium tabular-nums text-ink">
          {formatPaise(view.current.salesPaise)}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Last week</dt>
        <dd className="font-medium tabular-nums text-ink">{formatPaise(view.prior.salesPaise)}</dd>
      </div>
      <div>
        <dt className="text-muted">Bills this week</dt>
        <dd className="font-medium tabular-nums text-ink">{view.current.billCount}</dd>
      </div>
      <div>
        <dt className="text-muted">Vs last week</dt>
        <dd className="font-medium tabular-nums text-ink">{formatPaise(view.delta.salesPaise)}</dd>
      </div>
    </dl>
  );
}
