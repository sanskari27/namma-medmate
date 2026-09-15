import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import type { AccountantDesk } from '@/services/dashboards';
import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { DESK_BLURB, DESK_LABEL, formatPaise } from '../../DashboardScreen.utils';

export type DashboardAccountantDeskProps = {
  desk: AccountantDesk;
};

export function DashboardAccountantDesk({ desk }: DashboardAccountantDeskProps) {
  return (
    <section className="dash-card" aria-label={DESK_LABEL.accountant}>
      <header className="dash-card-head">
        <div>
          <h2>{DESK_LABEL.accountant}</h2>
          <p>{DESK_BLURB.accountant}</p>
        </div>
        <Link to={desk.sources.aging || ROUTES.AGING}>{DASHBOARD_CONTENT.openAging}</Link>
      </header>
      <div className="dash-stats dash-desk-stats">
        <p className="dash-stat">
          <span className="lbl">{DASHBOARD_CONTENT.accountantAr}</span>
          <span className="val">{formatPaise(desk.receivablesTotalPaise ?? 0)}</span>
        </p>
        <p className="dash-stat">
          <span className="lbl">{DASHBOARD_CONTENT.accountantAp}</span>
          <span className="val">{formatPaise(desk.payablesTotalPaise ?? 0)}</span>
        </p>
        <p className="dash-stat">
          <span className="lbl">{DASHBOARD_CONTENT.accountantSpend}</span>
          <span className="val">{formatPaise(desk.expenseTotalPaise)}</span>
        </p>
      </div>
      {desk.agingHint ? <p className="dash-card-pad">{desk.agingHint}</p> : null}
      <p className="dash-card-pad">
        <Link to={desk.sources.expenses || ROUTES.EXPENSES}>{DASHBOARD_CONTENT.openExpenses}</Link>
      </p>
    </section>
  );
}
