import { useSelector } from 'react-redux';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import { formatPaise } from '../../ReturnsScreen.utils';
import { selectReturnsSummary } from '../../store/returns.selectors';

export function ReturnsSummary() {
  const stats = useSelector(selectReturnsSummary);

  return (
    <div className="returns-kpis" aria-label="Returns summary">
      <div className="returns-kpi">
        <div className="k">{RETURNS_CONTENT.summary.returns}</div>
        <div className="v">{stats.count}</div>
      </div>
      <div className="returns-kpi">
        <div className="k">{RETURNS_CONTENT.summary.units}</div>
        <div className="v">{stats.units}</div>
      </div>
      <div className="returns-kpi">
        <div className="k">{RETURNS_CONTENT.summary.cash}</div>
        <div className="v">{formatPaise(stats.cashPaise)}</div>
      </div>
      <div className="returns-kpi">
        <div className="k">{RETURNS_CONTENT.summary.credit}</div>
        <div className="v">{formatPaise(stats.creditPaise)}</div>
      </div>
      <div className="returns-kpi">
        <div className="k">{RETURNS_CONTENT.summary.total}</div>
        <div className="v">{formatPaise(stats.totalPaise)}</div>
      </div>
    </div>
  );
}
