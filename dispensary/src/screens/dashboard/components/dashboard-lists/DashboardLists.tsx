import { DashboardAttentionPanel } from '../dashboard-attention-panel';
import { DashboardExpiringPanel } from '../dashboard-expiring-panel';
import { DashboardTopSellersPanel } from '../dashboard-top-sellers-panel';
import type { HomeDashboardView } from '@/services/homeDashboard';

export type DashboardListsProps = {
  view: HomeDashboardView;
};

/** Bottom three-up: attention, expiring, top sellers. */
export function DashboardLists({ view }: DashboardListsProps) {
  return (
    <div className="dash-grid-bottom">
      <DashboardAttentionPanel items={view.attention} />
      <DashboardExpiringPanel items={view.expiringSoon} />
      <DashboardTopSellersPanel items={view.topSellers} period={view.analytics.period} />
    </div>
  );
}
