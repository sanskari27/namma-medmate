import { useSelector } from 'react-redux';
import { BarMetricChart } from '@molecules/bar-metric-chart';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { formatPaise } from '../../TrendsScreen.utils';
import { selectTrendsView } from '../../store';

export function TrendsTopSellers() {
  const items = useSelector(selectTrendsView)?.topSellers ?? [];

  return (
    <section className="tr-card" aria-labelledby="compare-top-sellers">
      <div className="tr-card-head">
        <div>
          <h2 id="compare-top-sellers">{TRENDS_CONTENT.topSellers.title}</h2>
          <span className="sub">
            {items[0]
              ? `${items[0].name} led with ${formatPaise(items[0].salesPaise)}`
              : TRENDS_CONTENT.topSellers.empty}
          </span>
        </div>
      </div>
      <div className="tr-card-body">
        <BarMetricChart
          data={items.map((item) => ({ label: item.name, value: item.salesPaise / 100 }))}
          emptyLabel={TRENDS_CONTENT.topSellers.empty}
        />
        {items.length > 0 ? (
          <ul className="tr-list" style={{ marginTop: 12 }}>
            {items.slice(0, 6).map((item) => (
              <li key={item.productId}>
                <span className="nm">{item.name}</span>
                <span className="meta">
                  {formatPaise(item.salesPaise)} · {item.units} u
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
