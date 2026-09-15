import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import type { CashierDesk } from '@/services/dashboards';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { DESK_BLURB, DESK_LABEL, formatHeldAt, formatPaise } from '../../DashboardScreen.utils';

export type DashboardCashierDeskProps = {
  desk: CashierDesk;
};

export function DashboardCashierDesk({ desk }: DashboardCashierDeskProps) {
  return (
    <section className="dash-card" aria-label={DESK_LABEL.cashier}>
      <header className="dash-card-head">
        <div>
          <h2>{DESK_LABEL.cashier}</h2>
          <p>{DESK_BLURB.cashier}</p>
        </div>
        <Link to={desk.sources.sales || ROUTES.SALES}>{DASHBOARD_CONTENT.openTill}</Link>
      </header>
      <div className="dash-stats dash-desk-stats">
        <p className="dash-stat">
          <span className="lbl">{DASHBOARD_CONTENT.cashierSales}</span>
          <span className="val">{formatPaise(desk.todaySalesPaise)}</span>
        </p>
        <p className="dash-stat">
          <span className="lbl">{DASHBOARD_CONTENT.cashierBills}</span>
          <span className="val">{desk.todayBillCount}</span>
        </p>
      </div>
      <div className="dash-card-pad">
        <h3>{DASHBOARD_CONTENT.cashierHolds}</h3>
        {desk.holds.length === 0 ? (
          <p className="dash-muted">{DASHBOARD_CONTENT.emptyHolds}</p>
        ) : (
          <ul className="dash-desk-list">
            {desk.holds.map((hold) => (
              <li key={hold.id}>
                <Link to={desk.sources.holds || ROUTES.SALES}>{hold.invoiceNumber}</Link>
                <span>{formatPaise(hold.totalPaise)}</span>
                <time dateTime={hold.heldAt}>{formatHeldAt(hold.heldAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
