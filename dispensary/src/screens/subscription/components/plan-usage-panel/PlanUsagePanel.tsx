import { Label } from '@atoms';
import type { CurrentSubscription } from '@/services/subscriptions';
import type { Ref } from 'react';
import { StallStrip } from '../stall-strip';
import { floorDesks, formatIst, hasKiosk, hasLoyalty, planLabel } from '../../SubscriptionScreen.utils';

export function PlanUsagePanel({
  current,
  headingRef,
}: {
  current: CurrentSubscription;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <section
      aria-labelledby="usage-heading"
      className="border-l-4 border-l-brand border-y border-r border-line bg-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-3 py-2">
        <h2
          id="usage-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-sans text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
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
        <p className="mt-2 text-ink">
          {hasKiosk(current.entitledModules)
            ? 'Self-order kiosk is open on Pro for Kiosk outlets.'
            : 'Self-order kiosk stays locked until Pro.'}
        </p>
      </div>
    </section>
  );
}
