import { IndianRupee, Receipt, Package, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { formatPaise } from '../../TrendsScreen.utils';
import {
  selectTrendsAvgBill,
  selectTrendsCompare,
  selectTrendsDeltaPct,
  selectTrendsView,
} from '../../store';

function trendTone(delta: number | null): 'up' | 'down' | 'flat' {
  if (delta == null || delta === 0) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function TrendsSummaryStrip() {
  const view = useSelector(selectTrendsView);
  const compare = useSelector(selectTrendsCompare);
  const deltaPct = useSelector(selectTrendsDeltaPct);
  const avgBill = useSelector(selectTrendsAvgBill);

  if (!view) return null;

  const tone = trendTone(deltaPct);
  const windowLabel = compare === 'MOM' ? 'month' : 'week';

  return (
    <>
      <p className="tr-showing">
        Showing: {view.from} → {view.to}
        {view.branchName ? ` · ${view.branchName}` : ''}
        {` · ${view.current.billCount} bills`}
      </p>
      <div className="tr-stats" aria-label={`This ${windowLabel} vs last ${windowLabel}`}>
        <article className="tr-stat" data-accent="green">
          <div className="tr-stat-ic" aria-hidden>
            <IndianRupee className="size-5" />
          </div>
          <div className="tr-stat-lbl">{TRENDS_CONTENT.stats.currentSales}</div>
          <div className="tr-stat-val">{formatPaise(view.current.salesPaise)}</div>
          <div className="tr-stat-sub">
            {view.current.billCount} bills
            {avgBill ? ` · ${TRENDS_CONTENT.stats.avgBill} ${avgBill}` : ''}
          </div>
          {deltaPct != null ? (
            <span className={`tr-trend ${tone}`}>
              {tone === 'up' ? '↗' : tone === 'down' ? '↘' : '→'} {Math.abs(deltaPct).toFixed(1)}%
            </span>
          ) : null}
        </article>

        <article className="tr-stat" data-accent="blue">
          <div className="tr-stat-ic" aria-hidden>
            <TrendingUp className="size-5" />
          </div>
          <div className="tr-stat-lbl">{TRENDS_CONTENT.stats.priorSales}</div>
          <div className="tr-stat-val">{formatPaise(view.prior.salesPaise)}</div>
          <div className="tr-stat-sub">
            {view.priorFrom} → {view.priorTo}
          </div>
        </article>

        <article className="tr-stat" data-accent="gold">
          <div className="tr-stat-ic" aria-hidden>
            <Receipt className="size-5" />
          </div>
          <div className="tr-stat-lbl">{TRENDS_CONTENT.stats.bills}</div>
          <div className="tr-stat-val">{view.current.billCount}</div>
          <div className="tr-stat-sub">
            Prior {view.prior.billCount} · Δ {view.current.billCount - view.prior.billCount}
          </div>
        </article>

        <article className="tr-stat" data-accent="rose">
          <div className="tr-stat-ic" aria-hidden>
            <Package className="size-5" />
          </div>
          <div className="tr-stat-lbl">{TRENDS_CONTENT.stats.units}</div>
          <div className="tr-stat-val">{view.current.unitsSold}</div>
          <div className="tr-stat-sub">
            {TRENDS_CONTENT.stats.vsPrior} {formatPaise(view.delta.salesPaise)}
          </div>
        </article>
      </div>
    </>
  );
}
