import { useSelector } from 'react-redux';
import { BarMetricChart } from '@molecules/bar-metric-chart';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { frequencyLabel } from '../../TrendsScreen.utils';
import { selectTrendsView } from '../../store';

export function TrendsFrequency() {
  const items = useSelector(selectTrendsView)?.customerFrequency ?? [];

  return (
    <section className="tr-card" aria-labelledby="compare-frequency">
      <div className="tr-card-head">
        <div>
          <h2 id="compare-frequency">{TRENDS_CONTENT.frequency.title}</h2>
          <span className="sub">{TRENDS_CONTENT.frequency.hint}</span>
        </div>
      </div>
      <div className="tr-card-body">
        {items.length === 0 ? (
          <p className="tr-empty">{TRENDS_CONTENT.frequency.empty}</p>
        ) : (
          <>
            <ul className="tr-list" style={{ marginBottom: 12 }}>
              {items.map((item) => (
                <li key={item.bucket}>
                  <span className="nm">{frequencyLabel(item.bucket)}</span>
                  <span className="meta">
                    {item.currentCount}
                    {item.priorCount !== item.currentCount
                      ? ` · was ${item.priorCount}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
            <BarMetricChart
              data={items.map((item) => ({
                label: frequencyLabel(item.bucket),
                value: item.currentCount,
              }))}
              emptyLabel={TRENDS_CONTENT.frequency.empty}
            />
          </>
        )}
      </div>
    </section>
  );
}
