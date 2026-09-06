import type { AnalyticsView } from '@/services/analytics';
import { stockClassLabel } from '../../TrendsScreen.utils';

export function TrendsSlowDead({ items }: { items: AnalyticsView['slowDeadStock'] }) {
  return (
    <section className="border border-line bg-surface p-3" aria-labelledby="compare-slow-dead">
      <h2 id="compare-slow-dead" className="text-sm font-semibold text-ink">
        Slow and idle packs
      </h2>
      <p className="mt-1 text-sm text-muted">
        Idle means on the shelf with no sale this window. Slow means five or fewer units moved.
      </p>
      {items.length === 0 ? (
        <p className="mt-2 border border-dashed border-line bg-canvas px-3 py-6 text-sm text-muted">
          No slow or idle packs in this window.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-ink">{item.name}</span>
              <span className="tabular-nums text-muted">
                {stockClassLabel(item.classification)} · on hand {item.onHand}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
