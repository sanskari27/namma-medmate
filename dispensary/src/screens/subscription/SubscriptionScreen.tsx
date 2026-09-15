import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import { getCashfreePayment } from '@/services/subscriptions';
import { isApiError } from '@/services/axios';
import './SubscriptionScreen.css';
import { PlanCurrentCard } from './components/plan-current-card';
import { PlanRateBoard } from './components/plan-rate-board';
import { PlanStatusBanner } from './components/plan-status-banner';
import { paymentStatusCopy } from './SubscriptionScreen.utils';
import {
  accessDenied,
  checkoutHeld,
  loadSubscription,
  paymentNoted,
  statusSet,
} from './store';

export default function SubscriptionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const allowed = role === 'pharmacy_owner';
  const [params] = useSearchParams();
  const payOrder = params.get('payment');

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied('Only the pharmacy owner can change the plan at this counter.'));
      return;
    }
    void dispatch(loadSubscription());
  }, [allowed, dispatch]);

  useEffect(() => {
    if (!allowed || !payOrder) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const payment = await getCashfreePayment(payOrder);
        if (cancelled) {
          return;
        }
        dispatch(paymentNoted(paymentStatusCopy(payment.status)));
        if (payment.status === 'SUCCESS') {
          sessionStorage.removeItem(`nmm.cf.checkout.${payment.planCode}`);
          dispatch(checkoutHeld(null));
          await dispatch(loadSubscription());
          dispatch(statusSet({ status: 'success' }));
        } else if (payment.status === 'PENDING') {
          dispatch(checkoutHeld(payment.planCode));
        } else if (payment.status === 'FAILED') {
          dispatch(checkoutHeld(null));
          dispatch(statusSet({ status: 'failure' }));
        }
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isApiError(error) && error.status === 403) {
          dispatch(accessDenied('Only the pharmacy owner can change the plan at this counter.'));
        } else {
          dispatch(statusSet({ status: 'failure' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, dispatch, payOrder]);

  return (
    <div className="sb" aria-label="Pharmacy subscription">
      <PlanStatusBanner />
      {allowed ? (
        <>
          <PlanCurrentCard />
          <PlanRateBoard />
        </>
      ) : null}
    </div>
  );
}
