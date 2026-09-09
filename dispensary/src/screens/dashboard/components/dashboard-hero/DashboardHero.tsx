import { AlertTriangle, ClipboardList, Package, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  DASHBOARD_CONTENT,
  lowCountLabel,
  pendingCountLabel,
} from '../../DashboardScreen.content';
import { formatDay, formatPaise, greetingForHour } from '../../DashboardScreen.utils';

const QUICK_ICONS: Record<(typeof DASHBOARD_CONTENT.quickActions)[number]['tone'], LucideIcon> = {
  green: ShoppingCart,
  blue: Package,
  gold: ClipboardList,
  violet: AlertTriangle,
};

export type DashboardHeroProps = {
  displayName: string;
  view: HomeDashboardView;
};

export function DashboardHero({ displayName, view }: DashboardHeroProps) {
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] || displayName;
  const hour = new Date().getHours();
  const { hero, quickActions } = view;

  return (
    <section className="dash-hero" aria-label={DASHBOARD_CONTENT.regionHero}>
      <div className="dash-hero-l">
        <div className="dash-hero-greet">
          {greetingForHour(hour)}, {firstName}
        </div>
        <div className="dash-hero-sub">
          <span>{formatDay(view.asOf)}</span>
          <span className="dash-dotpill on">
            <i aria-hidden="true" />
            {DASHBOARD_CONTENT.storeOpen}
          </span>
          <span className={view.scope === 'tenant' ? 'dash-scope-pill' : undefined}>
            {view.branchName}
          </span>
        </div>
        <div className="dash-hero-mini">
          <span>
            <small>{DASHBOARD_CONTENT.metricThisMonth}</small>
            <b>{formatPaise(hero.monthSalesPaise)}</b>
          </span>
          <span>
            <small>{DASHBOARD_CONTENT.metricAvgBillToday}</small>
            <b>{formatPaise(hero.avgBillTodayPaise)}</b>
          </span>
          <span>
            <small>{DASHBOARD_CONTENT.metricItemsSoldToday}</small>
            <b>{hero.itemsSoldToday}</b>
          </span>
          <Link
            className={`dash-hero-mini-dues${hero.duesToCollectPaise > 0 ? ' warn' : ''}`}
            to={ROUTES.AGING}
          >
            <small>{DASHBOARD_CONTENT.metricDuesToCollect}</small>
            <b>
              {hero.duesCustomerCount > 0
                ? hero.duesCustomerCount
                : formatPaise(hero.duesToCollectPaise)}
            </b>
          </Link>
        </div>
      </div>
      <div className="dash-qa">
        {DASHBOARD_CONTENT.quickActions.map((action) => {
          const Icon = QUICK_ICONS[action.tone];
          const subtitle =
            'subtitle' in action
              ? action.subtitle
              : action.subtitleKey === 'pending'
                ? pendingCountLabel(quickActions.pendingPrescriptions)
                : lowCountLabel(quickActions.lowStockCount);
          return (
            <Link key={action.to} className={`dash-qa-tile ${action.tone}`} to={action.to}>
              <span className="ic" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="tx">
                <b>{action.title}</b>
                <small>{subtitle}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
