import { Hourglass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryMark } from '@atoms';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';

export type DashboardExpiringPanelProps = {
  items: HomeDashboardView['expiringSoon'];
};

export function DashboardExpiringPanel({ items }: DashboardExpiringPanelProps) {
  return (
    <section className="dash-card" aria-labelledby="dash-expiring">
      <div className="dash-card-head">
        <div>
          <h3 id="dash-expiring">{DASHBOARD_CONTENT.expiringTitle}</h3>
        </div>
        <Link to={ROUTES.INVENTORY}>{DASHBOARD_CONTENT.linkInventoryArrow}</Link>
      </div>
      <div className="dash-card-pad">
        {items.length === 0 ? (
          <p className="dash-empty">{DASHBOARD_CONTENT.emptyExpiring}</p>
        ) : (
          items.map((row) => (
            <Link
              key={`${row.productId}-${row.batchNumber}`}
              className="dash-row dash-row-link"
              to={ROUTES.INVENTORY}
            >
              {row.categoryIcon ? (
                <CategoryMark icon={row.categoryIcon} size="sm" />
              ) : (
                <span className="em em-gold" aria-hidden="true">
                  <Hourglass size={16} />
                </span>
              )}
              <div className="gw">
                <div className="t">{row.productName}</div>
                <div className="s">
                  Batch {row.batchNumber} · expires {row.expiresOn} · qty {row.quantity}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
