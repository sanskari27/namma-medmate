import { useSelector } from 'react-redux';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { stockClassLabel } from '../../TrendsScreen.utils';
import { selectTrendsView } from '../../store';

export function TrendsSlowDead() {
  const items = useSelector(selectTrendsView)?.slowDeadStock ?? [];

  return (
    <section className="tr-card" aria-labelledby="compare-slow-dead">
      <div className="tr-card-head">
        <div>
          <h2 id="compare-slow-dead">{TRENDS_CONTENT.slowDead.title}</h2>
          <span className="sub">{TRENDS_CONTENT.slowDead.hint}</span>
        </div>
      </div>
      <div className="tr-card-body">
        {items.length === 0 ? (
          <p className="tr-empty">{TRENDS_CONTENT.slowDead.empty}</p>
        ) : (
          <ul className="tr-list">
            {items.map((item) => (
              <li key={item.productId}>
                <span className="nm">
                  {item.name}{' '}
                  <span
                    className={`tr-pill ${item.classification === 'DEAD' ? 'idle' : ''}`}
                  >
                    {stockClassLabel(item.classification)}
                  </span>
                </span>
                <span className="meta">
                  on hand {item.onHand} · sold {item.unitsSold}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
