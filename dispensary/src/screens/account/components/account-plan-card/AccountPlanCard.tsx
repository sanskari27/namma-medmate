import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import { formatIstDate, modulesLabel, planLabel, seatsLabel } from '../../AccountScreen.utils';
import { selectAccountSubscription } from '../../store';

export function AccountPlanCard() {
  const subscription = useSelector(selectAccountSubscription);
  if (!subscription) {
    return (
      <div className="ac-card">
        <div className="ac-card-head">
          <h3>{ACCOUNT_CONTENT.planUsage}</h3>
        </div>
        <div className="ac-card-pad">
          <p className="ac-muted">No plan on file yet. Finish KYC so this pharmacy can start on Free.</p>
        </div>
      </div>
    );
  }
  const seats = seatsLabel(subscription);
  const seatPct =
    subscription.maxUsers == null
      ? 100
      : Math.min(100, Math.round((subscription.usersUsed / Math.max(subscription.maxUsers, 1)) * 100));

  return (
    <div className="ac-card">
      <div className="ac-card-head">
        <h3>{ACCOUNT_CONTENT.planUsage}</h3>
        <span className="ac-pill" data-live="true">
          {subscription.status.toLowerCase()}
        </span>
      </div>
      <div className="ac-card-pad">
        <div className="ac-flex" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 800, fontSize: 24 }}>
              {planLabel(subscription.planCode)}
            </div>
            <div className="ac-muted">
              {subscription.maxUsers == null ? 'Open seats' : `${subscription.maxUsers} users`}
            </div>
          </div>
          <Link className="ac-btn ac-btn-sm ac-btn-ghost" to={ROUTES.SUBSCRIPTION}>
            {ACCOUNT_CONTENT.manage} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="ac-usage">
          <div className="ac-usage-row">
            <span className="ac-muted">Team seats</span>
            <b>{seats}</b>
          </div>
          <div className="ac-bar">
            <span style={{ width: `${seatPct}%` }} />
          </div>
        </div>
        <div className="ac-usage">
          <div className="ac-usage-row">
            <span className="ac-muted">Modules</span>
            <b>{modulesLabel(subscription)}</b>
          </div>
          <div className="ac-bar">
            <span style={{ width: '100%' }} />
          </div>
        </div>
        <div className="ac-dash">
          <span className="ac-muted">Renews on</span>
          <b>{formatIstDate(subscription.expiresAt)}</b>
        </div>
      </div>
    </div>
  );
}
