import { Crown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectSubCurrent } from '../../store';
import { formatIst, planLabel } from '../../SubscriptionScreen.utils';

export function PlanCurrentCard() {
  const current = useSelector(selectSubCurrent);
  if (!current) {
    return null;
  }
  return (
    <div className="sb-card sb-card-pad sb-flex" style={{ gap: 16 }}>
      <span className="sb-av" style={{ background: 'linear-gradient(135deg,#cf9846,#b8842f)' }}>
        <Crown size={26} color="#fff" />
      </span>
      <div style={{ flex: 1 }}>
        <div className="sb-flex sb-pills" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{planLabel(current.planCode)} plan</h3>
          <span className="sb-pill" data-live="true">
            {current.status.toLowerCase()}
          </span>
          <span className="sb-pill" data-tone="tag">
            Monthly billing
          </span>
        </div>
        <p className="sb-muted">
          {current.maxUsers == null ? 'Open seats' : `${current.maxUsers} users`} · renews on{' '}
          <b>{formatIst(current.expiresAt)}</b>
        </p>
      </div>
    </div>
  );
}
