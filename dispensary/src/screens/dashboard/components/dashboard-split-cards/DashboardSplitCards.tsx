import { Globe, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryMark } from '@atoms';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';
import { paymentModeIcon } from '../../DashboardScreen.icons';
import { actualPeriodCaption, DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { formatPaise, pctOf, periodLabel } from '../../DashboardScreen.utils';

export type DashboardSplitCardsProps = {
  analytics: HomeDashboardView['analytics'];
};

export function DashboardSplitCards({ analytics }: DashboardSplitCardsProps) {
  const period = periodLabel(analytics.period);
  const actualCaption = actualPeriodCaption(period);
  const channelTotal = Math.max(analytics.totalSalesPaise, 1);

  return (
    <div className="dash-grid-3" style={{ marginTop: 16 }}>
      <section className="dash-card" aria-labelledby="dash-channel-split">
        <div className="dash-card-head">
          <div>
            <h3 id="dash-channel-split">{DASHBOARD_CONTENT.channelSplit}</h3>
            <p>{actualCaption}</p>
          </div>
        </div>
        <div className="dash-card-pad compact dash-compact-rows">
          {analytics.channelSplit.length === 0 ? (
            <p className="dash-empty">{DASHBOARD_CONTENT.emptyChannel}</p>
          ) : (
            <>
              <div className="dash-bar-track" aria-hidden="true">
                {analytics.channelSplit.map((row) => {
                  const width = (row.salesPaise / channelTotal) * 100;
                  if (width <= 0) return null;
                  return (
                    <span
                      key={row.key}
                      className={`dash-bar-seg ${row.key === 'ONLINE' ? 'online' : 'counter'}`}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>
              {analytics.channelSplit.map((row) => {
                const Icon = row.key === 'ONLINE' ? Globe : Receipt;
                const pct = pctOf(row.salesPaise, analytics.totalSalesPaise);
                return (
                  <Link key={row.key} className="dash-row dash-row-link" to={ROUTES.SALES}>
                    <span className="em" aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    <div className="gw">
                      <div className="t">{row.label}</div>
                      <div className="s">{formatPaise(row.salesPaise)}</div>
                    </div>
                    <span className="dash-row-pct">{pct}%</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </section>

      <section className="dash-card" aria-labelledby="dash-payment-modes">
        <div className="dash-card-head">
          <div>
            <h3 id="dash-payment-modes">{DASHBOARD_CONTENT.paymentModes}</h3>
            <p>{actualCaption}</p>
          </div>
        </div>
        <div className="dash-card-pad compact dash-compact-rows">
          {analytics.paymentModes.length === 0 ? (
            <p className="dash-empty">{DASHBOARD_CONTENT.emptyPayments}</p>
          ) : (
            analytics.paymentModes.map((row) => {
              const Icon = paymentModeIcon(row.mode);
              const pct = pctOf(row.salesPaise, analytics.totalSalesPaise);
              return (
                <div key={row.mode} className="dash-row dash-row-stack">
                  <div className="dash-row-main">
                    <span className="em em-teal" aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    <div className="gw">
                      <div className="t">{row.label}</div>
                      <div className="s">{formatPaise(row.salesPaise)}</div>
                    </div>
                    <span className="dash-row-pct">{pct}%</span>
                  </div>
                  <div className="dash-meter" aria-hidden="true">
                    <span style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="dash-card" aria-labelledby="dash-top-categories">
        <div className="dash-card-head">
          <div>
            <h3 id="dash-top-categories">{DASHBOARD_CONTENT.topCategories}</h3>
            <p>{actualCaption}</p>
          </div>
        </div>
        <div className="dash-card-pad compact dash-compact-rows">
          {analytics.topCategories.length === 0 ? (
            <p className="dash-empty">{DASHBOARD_CONTENT.emptyCategories}</p>
          ) : (
            analytics.topCategories.map((row) => {
              const pct = pctOf(row.salesPaise, analytics.totalSalesPaise);
              return (
                <Link
                  key={row.categoryId}
                  className="dash-row dash-row-stack dash-row-link"
                  to={ROUTES.INVENTORY}
                >
                  <div className="dash-row-main">
                    <CategoryMark icon={row.icon} size="sm" />
                    <div className="gw">
                      <div className="t">{row.name}</div>
                      <div className="s">{formatPaise(row.salesPaise)}</div>
                    </div>
                    <span className="dash-row-pct">{pct}%</span>
                  </div>
                  <div className="dash-meter" aria-hidden="true">
                    <span style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
