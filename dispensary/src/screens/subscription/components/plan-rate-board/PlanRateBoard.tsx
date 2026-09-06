import { Button } from '@atoms';
import type { CurrentSubscription, PlanOffer } from '@/services/subscriptions';

const PLAN_ORDER = ['FREE', 'STARTER', 'GROWTH', 'PRO'] as const;

type PlanRateBoardProps = {
  plans: PlanOffer[];
  current: CurrentSubscription | null;
  pendingPlan: string | null;
  onSwitch: (planCode: string) => void;
};

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

function stubIndex(code: string): string {
  const rank = PLAN_ORDER.indexOf(code as (typeof PLAN_ORDER)[number]);
  return String(rank + 1).padStart(2, '0');
}

function monthly(paise: number): { amount: string; cadence: string } {
  if (paise === 0) {
    return { amount: '₹0', cadence: 'no monthly bill' };
  }
  return {
    amount: `₹${(paise / 100).toLocaleString('en-IN')}`,
    cadence: 'a month',
  };
}

function fitsFloor(plan: PlanOffer, current: CurrentSubscription | null): boolean {
  if (!current) {
    return true;
  }
  if (current.branchesUsed > plan.maxBranches) {
    return false;
  }
  if (plan.maxUsers != null && current.usersUsed > plan.maxUsers) {
    return false;
  }
  return true;
}

function SlotMarks({ count, label }: { count: number; label: string }) {
  const shown = Math.min(count, 8);
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <ol className="mt-1 flex gap-0.5" aria-hidden="true">
        {Array.from({ length: shown }, (_, index) => (
          <li key={index} className="size-3.5 border border-brand bg-brand-soft" />
        ))}
        {count > shown ? (
          <li className="pl-1 font-mono text-[10px] text-muted">+{count - shown}</li>
        ) : null}
      </ol>
    </div>
  );
}

export function PlanRateBoard({ plans, current, pendingPlan, onSwitch }: PlanRateBoardProps) {
  return (
    <ul className="flex flex-col gap-2">
      {plans.map((plan) => {
        const currentPlan = current?.planCode === plan.planCode;
        const price = monthly(plan.pricePaiseMonthly);
        const fit = fitsFloor(plan, current);
        const loyalty = plan.entitledModules.includes('LOYALTY');
        const kiosk = plan.entitledModules.includes('KIOSK');
        return (
          <li key={plan.planCode}>
            <article
              className={
                currentPlan
                  ? 'flex border border-brand bg-brand-soft'
                  : 'flex border border-line bg-surface'
              }
            >
              <p
                className={
                  currentPlan
                    ? 'flex w-12 shrink-0 flex-col items-center justify-center bg-brand font-mono text-xs text-surface'
                    : 'flex w-12 shrink-0 flex-col items-center justify-center bg-ink font-mono text-xs text-surface'
                }
                aria-hidden="true"
              >
                {stubIndex(plan.planCode)}
              </p>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-line px-3 py-2">
                  <h3 className="font-sans text-base font-semibold text-ink">
                    {planLabel(plan.planCode)}
                  </h3>
                  <p className="font-mono text-ink">
                    <span className="text-xl tabular-nums">{price.amount}</span>
                    <span className="ml-2 text-xs text-muted">{price.cadence}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3 px-3 py-3">
                  <div className="flex flex-wrap gap-6">
                    <SlotMarks
                      count={plan.maxBranches}
                      label={`${plan.maxBranches} outlet ${plan.maxBranches === 1 ? 'stall' : 'stalls'}`}
                    />
                    {plan.maxUsers == null ? (
                      <div>
                        <p className="text-xs text-muted">Till logins</p>
                        <p className="mt-1 font-mono text-sm text-ink">Open</p>
                      </div>
                    ) : (
                      <SlotMarks count={plan.maxUsers} label={`${plan.maxUsers} till logins`} />
                    )}
                    <div>
                      <p className="text-xs text-muted">Loyalty desk</p>
                      <p className="mt-1 text-sm text-ink">
                        {loyalty ? 'Points desk open' : 'Locked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Self-order kiosk</p>
                      <p className="mt-1 text-sm text-ink">{kiosk ? 'Pro kiosk open' : 'Locked'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {currentPlan ? (
                      <p className="text-sm text-muted">On this plan</p>
                    ) : (
                      <>
                        <p className={fit ? 'text-xs text-muted' : 'text-xs text-warn'}>
                          {fit
                            ? 'Fits this floor’s current stalls and till keys'
                            : 'Won’t fit this floor until you close an outlet or till login'}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          disabled={pendingPlan !== null}
                          aria-label={
                            plan.pricePaiseMonthly > 0
                              ? `Pay this pharmacy’s plan for ${planLabel(plan.planCode)}`
                              : `Switch this pharmacy to ${planLabel(plan.planCode)}`
                          }
                          onClick={() => onSwitch(plan.planCode)}
                        >
                          {pendingPlan === plan.planCode
                            ? plan.pricePaiseMonthly > 0
                              ? 'Opening checkout…'
                              : 'Switching…'
                            : plan.pricePaiseMonthly > 0
                              ? 'Pay this plan'
                              : 'Switch plan'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
