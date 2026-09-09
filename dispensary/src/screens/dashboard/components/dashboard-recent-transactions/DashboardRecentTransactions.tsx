import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { formatPaise } from '../../DashboardScreen.utils';

export type DashboardRecentTransactionsProps = {
  items: HomeDashboardView['recentTransactions'];
};

export function DashboardRecentTransactions({ items }: DashboardRecentTransactionsProps) {
  return (
    <section className="dash-card" style={{ marginTop: 16 }} aria-labelledby="dash-recent">
      <div className="dash-card-head">
        <div>
          <h3 id="dash-recent">{DASHBOARD_CONTENT.recentTitle}</h3>
        </div>
        <Link to={ROUTES.SALES}>{DASHBOARD_CONTENT.linkViewAllArrow}</Link>
      </div>
      <div className="dash-card-pad">
        {items.length === 0 ? (
          <p className="dash-empty">{DASHBOARD_CONTENT.emptyRecent}</p>
        ) : (
          items.map((row) => (
            <Link key={row.id} className="dash-row dash-row-link" to={ROUTES.SALES}>
              <span className="em em-green" aria-hidden="true">
                <FileText size={16} />
              </span>
              <div className="gw">
                <div className="t">{row.invoiceNumber}</div>
                <div className="s">
                  {row.customerLabel} · {formatPaise(row.totalPaise)}
                </div>
              </div>
              <span className="dash-row-amt">{formatPaise(row.totalPaise)}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
