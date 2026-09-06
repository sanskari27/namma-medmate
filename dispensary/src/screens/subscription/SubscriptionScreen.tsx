import { ROUTES } from '@/libs/constants/routes.const';
import {
  getCashfreePayment,
  getCatalogue,
  getCurrentSubscription,
  isApiError,
  startCashfreeCheckout,
  upgradePlan,
  type CurrentSubscription,
  type PlanOffer,
} from '@/services/subscriptions';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { PlanHeader } from './components/plan-header';
import { PlanRateBoard } from './components/plan-rate-board';
import { PlanStatusBanner } from './components/plan-status-banner';
import { PlanUsagePanel } from './components/plan-usage-panel';
import {
  isPaidPlan,
  paymentStatusCopy,
  sortPlans,
  statusCopy,
  type PageStatus,
} from './SubscriptionScreen.utils';

export default function SubscriptionScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'pharmacy_owner';
  const statusId = useId();
  const [params] = useSearchParams();
  const payOrder = params.get('payment');
  const restoreRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PlanOffer[]>([]);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [sub, catalogue] = await Promise.all([getCurrentSubscription(), getCatalogue()]);
      setCurrent(sub);
      setPlans(catalogue);
      setStatus(null);
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setStatus('denied');
        return;
      }
      if (isApiError(err) && (err.status === 404 || err.code === 'PLAN_LIMIT')) {
        setStatus('empty');
        return;
      }
      setStatus('failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

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
        const note = paymentStatusCopy(payment.status);
        setPaymentNote(note);
        if (payment.status === 'SUCCESS') {
          const sub = await getCurrentSubscription();
          if (!cancelled) {
            setCurrent(sub);
            setStatus('success');
          }
        } else if (payment.status === 'PENDING' || payment.status === 'ABANDONED') {
          setStatus(null);
        } else if (payment.status === 'FAILED') {
          setStatus('failure');
        }
        restoreRef.current?.focus();
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isApiError(err) && err.status === 403) {
          setStatus('denied');
          return;
        }
        if (isApiError(err) && err.status === 409) {
          setStatus('conflict');
          return;
        }
        setStatus('failure');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, payOrder]);

  async function onUpgrade(planCode: string) {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (current && planCode === current.planCode) {
      setStatus('validation');
      return;
    }
    const offer = plans.find((plan) => plan.planCode === planCode);
    setPendingPlan(planCode);
    setPaymentNote(null);
    try {
      if (offer && isPaidPlan(offer)) {
        const checkout = await startCashfreeCheckout(planCode, crypto.randomUUID());
        if (checkout.checkoutUrl) {
          window.location.assign(checkout.checkoutUrl);
          return;
        }
        setStatus('failure');
        return;
      }
      const next = await upgradePlan(planCode, crypto.randomUUID());
      setCurrent(next);
      setStatus('success');
      restoreRef.current?.focus();
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 403) {
          setStatus('denied');
        } else if (err.status === 409) {
          setStatus('conflict');
        } else if (err.code === 'PLAN_LIMIT') {
          setStatus('quota');
        } else if (err.status === 400 || err.status === 422) {
          setStatus('validation');
        } else {
          setStatus('failure');
        }
      } else {
        setStatus('failure');
      }
    } finally {
      setPendingPlan(null);
    }
  }

  const banner = statusCopy(status);
  const orderedPlans = sortPlans(plans);

  return (
    <div className="flex flex-col gap-4">
      <PlanHeader />

      {banner ? <PlanStatusBanner statusId={statusId} banner={banner} /> : null}
      {paymentNote && !banner ? (
        <p role="alert" aria-live="polite" className="border border-line bg-brand-soft px-3 py-2 text-sm text-ink">
          {paymentNote}
        </p>
      ) : null}

      {current ? <PlanUsagePanel current={current} /> : null}

      {orderedPlans.length > 0 ? (
        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-1 font-sans text-sm font-semibold text-ink">
            Available plans
          </h2>
          <p className="mb-3 text-sm text-muted">
            Each slip is a floor rate card: numbered stub, monthly bill, stall marks, till keys.
            Paid cards open checkout; switching down is blocked if this pharmacy already fills more
            stalls than that card allows.
          </p>
          <PlanRateBoard
            plans={orderedPlans}
            current={current}
            pendingPlan={pendingPlan}
            onSwitch={(planCode) => void onUpgrade(planCode)}
          />
          <p className="mt-3 text-xs text-muted">
            Need another outlet first? Open{' '}
            <Link className="text-brand underline" to={ROUTES.BRANCHES}>
              Outlets
            </Link>
            .
          </p>
        </section>
      ) : null}
      <button ref={restoreRef} type="button" className="sr-only" tabIndex={-1} aria-hidden="true">
        Restore focus
      </button>
    </div>
  );
}
