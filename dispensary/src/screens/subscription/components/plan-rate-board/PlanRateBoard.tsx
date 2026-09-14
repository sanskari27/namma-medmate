import { Check, Star } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { selectSubCurrent, selectSubPending, selectSubPlans, switchPlan } from '../../store';
import {
  formatRupees,
  isPaidPlan,
  planFeatures,
  planLabel,
  planTagline,
} from '../../SubscriptionScreen.utils';

export function PlanRateBoard() {
  const dispatch = useDispatch<AppDispatch>();
  const plans = useSelector(selectSubPlans);
  const current = useSelector(selectSubCurrent);
  const pending = useSelector(selectSubPending);

  return (
    <>
      <div className="sb-sec-head sb-flex" style={{ justifyContent: 'space-between' }}>
        <h2>Plans</h2>
        <span className="sb-muted">switch anytime · prices exclude 18% GST</span>
      </div>
      <div className="sb-plans">
        {plans.map((plan) => {
          const on = current?.planCode === plan.planCode;
          const popular = plan.planCode === 'GROWTH';
          const label = planLabel(plan.planCode);
          return (
            <article key={plan.planCode} className="sb-card sb-plan" data-current={on}>
              {plan.planCode === 'FREE' ? (
                <span className="sb-pill sb-plan-badge">
                  <Check size={12} /> Free forever
                </span>
              ) : null}
              {popular ? (
                <span className="sb-pill sb-plan-badge" data-tone="gold">
                  <Star size={12} /> Popular
                </span>
              ) : null}
              <h3>{label}</h3>
              <div className="sb-muted" style={{ fontSize: 12 }}>
                {planTagline(plan.planCode)}
              </div>
              <div className="sb-price">
                {formatRupees(plan.pricePaiseMonthly)}
                {plan.pricePaiseMonthly > 0 ? (
                  <span className="sb-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                    /month
                  </span>
                ) : null}
              </div>
              <div className="sb-muted" style={{ fontSize: 11.5, marginBottom: 12 }}>
                {plan.maxBranches} outlet{plan.maxBranches === 1 ? '' : 's'}
              </div>
              <div style={{ marginBottom: 14 }}>
                {planFeatures(plan).map((feat) => (
                  <div key={feat} className="sb-feat">
                    <Check size={13} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              {on ? (
                <button type="button" className="sb-btn sb-btn-ghost sb-btn-block" disabled>
                  Current plan
                </button>
              ) : (
                <button
                  type="button"
                  className={`sb-btn sb-btn-block ${isPaidPlan(plan) ? 'sb-btn-primary' : 'sb-btn-ghost'}`}
                  disabled={pending !== null}
                  onClick={() => void dispatch(switchPlan(plan.planCode))}
                >
                  {pending === plan.planCode
                    ? isPaidPlan(plan)
                      ? 'Opening checkout…'
                      : 'Switching…'
                    : isPaidPlan(plan)
                      ? `Upgrade to ${label}`
                      : `Switch to ${label}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
