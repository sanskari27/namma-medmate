import { Crown } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectSubCurrent, selectSubStatus } from '../../store';
import { formatIst, planLabel } from '../../SubscriptionScreen.utils';

export function PlanCurrentCard() {
  const current = useSelector(selectSubCurrent);
  const status = useSelector(selectSubStatus);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === 'success') {
      headingRef.current?.focus();
    }
  }, [status]);

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
          <h3 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: 17 }}>
            {planLabel(current.planCode)} plan
          </h3>
          <span className="sb-pill" data-live="true">
            {current.status.toLowerCase()}
          </span>
          {current.planCode === 'FREE' ? null : (
            <span className="sb-pill" data-tone="tag">
              Monthly billing
            </span>
          )}
        </div>
        <p className="sb-muted">
          {current.maxUsers == null ? 'Open seats' : `${current.maxUsers} users`} · renews on{' '}
          <b>{formatIst(current.expiresAt)}</b>
        </p>
      </div>
    </div>
  );
}
