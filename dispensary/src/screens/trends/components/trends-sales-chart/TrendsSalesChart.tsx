import { useSelector } from 'react-redux';
import { AreaMetricChart } from '@molecules/area-metric-chart';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { formatPaise } from '../../TrendsScreen.utils';
import { selectTrendsView } from '../../store';

export function TrendsSalesChart() {
  const view = useSelector(selectTrendsView);
  if (!view) return null;

  const data = view.salesTrend.points.map((point) => ({
    label: point.date.slice(8),
    value: point.currentPaise / 100,
  }));

  return (
    <section className="tr-card" aria-labelledby="compare-sales-trend">
      <div className="tr-card-head">
        <div>
          <h2 id="compare-sales-trend">{TRENDS_CONTENT.chart.title}</h2>
          <span className="sub">
            This window {formatPaise(view.current.salesPaise)} against prior{' '}
            {formatPaise(view.prior.salesPaise)}
          </span>
        </div>
      </div>
      <div className="tr-card-body">
        <AreaMetricChart data={data} emptyLabel={TRENDS_CONTENT.chart.empty} />
      </div>
    </section>
  );
}
