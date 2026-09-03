import { Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  getCatalogue,
  getCurrentSubscription,
  isApiError,
  upgradePlan,
  type CurrentSubscription,
  type PlanOffer,
} from '@/services/subscriptions';
import type { RootState } from '@/store';
import { AlertCircle, BadgeCheck, BadgePercent, Unplug } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { PlanRateBoard } from './components/plan-rate-board';
import { StallStrip } from './components/stall-strip';

type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | null;

const PLAN_ORDER = ['FREE', 'STARTER', 'GROWTH', 'PRO'] as const;

function planLabel(code: string): string {
  switch (code) {
    case 'FREE':
      return 'Free';
    case 'STARTER':
      return 'Starter';
    case 'GROWTH':
      return 'Growth';
    case 'PRO':
      return 'Pro';
    default:
      return code;
  }
}

function hasLoyalty(modules: string[]): boolean {
  return modules.includes('LOYALTY');
}

function floorDesks(modules: string[]): string {
  const names = modules
    .filter((code) => code !== 'LOYALTY')
    .map((code) => {
      switch (code) {
        case 'SALES':
          return 'billing';
        case 'INVENTORY':
          return 'stock';
        case 'PROCUREMENT':
          return 'purchase';
        case 'CRM':
          return 'patients';
        case 'FINANCE':
          return 'accounts';
        case 'REPORTING':
          return 'reports';
        case 'STAFF':
          return 'staff';
        case 'ROLES':
          return 'floor roles';
        case 'APPROVALS':
          return 'sign-off';
        default:
          return code.toLowerCase();
      }
    });
  return names.join(', ');
}

function formatIst(value: string | null): string {
  if (!value) {
    return 'No expiry on file';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: BadgePercent, text: 'Loading this pharmacy’s plan…' };
    case 'empty':
      return {
        icon: BadgePercent,
        text: 'No plan on file yet. Finish KYC so this pharmacy can start on Free.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Choose a higher plan before changing this pharmacy’s plan.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can change the plan at this counter.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This pharmacy already uses more outlets or till logins than that plan allows. Reduce usage first.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not reach the server for this pharmacy’s plan. Try again.',
      };
    case 'success':
      return { icon: BadgeCheck, text: 'Plan updated for this pharmacy.' };
    case 'quota':
      return {
        icon: AlertCircle,
        text: 'This pharmacy is at a plan limit. Upgrade below to add more outlets or till logins.',
      };
    default:
      return null;
  }
}

export default function SubscriptionScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'pharmacy_owner';
  const statusId = useId();
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PlanOffer[]>([]);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

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

  async function onUpgrade(planCode: string) {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (current && planCode === current.planCode) {
      setStatus('validation');
      return;
    }
    setPendingPlan(planCode);
    try {
      const next = await upgradePlan(planCode, crypto.randomUUID());
      setCurrent(next);
      setStatus('success');
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
  const orderedPlans = [...plans].sort((a, b) => {
    const rank = (code: string) => PLAN_ORDER.indexOf(code as (typeof PLAN_ORDER)[number]);
    return rank(a.planCode) - rank(b.planCode);
  });

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <header className="flex flex-col gap-1 border-b border-dashed border-line pb-3">
          <h1 className="font-sans text-xl font-semibold text-ink">Plan for this pharmacy</h1>
          <p className="text-sm text-muted">
            Read this like the shop licence board: stalls filled, till keys issued, and the monthly
            rate if you add another outlet.
          </p>
        </header>
      </Reveal>

      {banner ? (
        <p
          id={statusId}
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 border border-line bg-brand-soft px-3 py-2 text-sm text-ink"
        >
          <banner.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {banner.text}
        </p>
      ) : null}

      {current ? (
        <section
          aria-labelledby="usage-heading"
          className="border-l-4 border-l-brand border-y border-r border-line bg-surface"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-3 py-2">
            <h2 id="usage-heading" className="font-sans text-sm font-semibold">
              {planLabel(current.planCode)} licence
            </h2>
            <p className="font-mono text-xs text-muted">{current.status}</p>
          </header>
          <dl className="grid gap-px bg-line sm:grid-cols-2">
            <div className="bg-surface px-3 py-3">
              <dt>
                <Label>Outlets in use</Label>
              </dt>
              <dd className="mt-1">
                <StallStrip
                  used={current.branchesUsed}
                  cap={current.effectiveBranchLimit}
                  unit="outlets"
                />
              </dd>
            </div>
            <div className="bg-surface px-3 py-3">
              <dt>
                <Label>Till logins in use</Label>
              </dt>
              <dd className="mt-1">
                <StallStrip used={current.usersUsed} cap={current.maxUsers} unit="till logins" />
              </dd>
            </div>
            <div className="bg-surface px-3 py-3">
              <dt>
                <Label>Floor started (IST)</Label>
              </dt>
              <dd className="mt-1 font-mono text-sm text-ink">{formatIst(current.startedAt)}</dd>
            </div>
            <div className="bg-surface px-3 py-3">
              <dt>
                <Label>Licence expiry (IST)</Label>
              </dt>
              <dd className="mt-1 font-mono text-sm text-ink">{formatIst(current.expiresAt)}</dd>
            </div>
          </dl>
          <div className="border-t border-line px-3 py-3 text-sm">
            <p className="font-medium text-ink">On this floor today</p>
            <p className="mt-1 text-muted">{floorDesks(current.entitledModules)}</p>
            <p className="mt-2 text-ink">
              {hasLoyalty(current.entitledModules)
                ? 'Loyalty points desk is open on this plan.'
                : 'Loyalty points stay locked until Growth or Pro.'}
            </p>
          </div>
        </section>
      ) : null}

      {orderedPlans.length > 0 ? (
        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-1 font-sans text-sm font-semibold text-ink">
            Available plans
          </h2>
          <p className="mb-3 text-sm text-muted">
            Each slip is a floor rate card: numbered stub, monthly bill, stall marks, till keys.
            Switching down is blocked if this pharmacy already fills more stalls than that card
            allows.
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
    </div>
  );
}
