import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryMark } from '@atoms';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT, topSellersHeading } from '../../DashboardScreen.content';
import { formatPaise, periodLabel } from '../../DashboardScreen.utils';

export type DashboardTopSellersPanelProps = {
  items: HomeDashboardView['topSellers'];
  period: HomeDashboardView['analytics']['period'];
};

export function DashboardTopSellersPanel({ items, period }: DashboardTopSellersPanelProps) {
  return (
    <section className="dash-card" aria-labelledby="dash-top-sellers">
      <div className="dash-card-head">
        <div>
          <h3 id="dash-top-sellers">{topSellersHeading(periodLabel(period))}</h3>
        </div>
        <Link to={ROUTES.REPORTS}>{DASHBOARD_CONTENT.linkReportsArrow}</Link>
      </div>
      <div className="dash-card-pad">
        {items.length === 0 ? (
          <p className="dash-empty">{DASHBOARD_CONTENT.emptyTopSellers}</p>
        ) : (
          items.map((row) => (
            <Link key={row.productId} className="dash-row dash-row-link" to={ROUTES.INVENTORY}>
              {row.categoryIcon ? (
                <CategoryMark icon={row.categoryIcon} size="sm" />
              ) : (
                <span className="em em-gold" aria-hidden="true">
                  <Trophy size={16} />
                </span>
              )}
              <div className="gw">
                <div className="t">{row.productName}</div>
                <div className="s">
                  {row.sku} · qty {row.quantity} · {formatPaise(row.salesPaise)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
