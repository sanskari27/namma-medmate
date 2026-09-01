import { buttonVariants } from '@namma-medmate/shared-ui';
import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';
import { paywallBody, paywallTitle } from '../lib/copy.ts';
import { MONTHLY_INR, type PlanId } from '../packaging.ts';

export interface PaywallProps {
  requiredPlan: PlanId;
  monthlyInr?: number;
}

export function Paywall({ requiredPlan, monthlyInr }: PaywallProps) {
  const price = monthlyInr ?? MONTHLY_INR[requiredPlan];
  return (
    <section
      className="mx-auto flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
      aria-labelledby="plan-gating-paywall-title"
    >
      <h1
        id="plan-gating-paywall-title"
        className="text-3xl font-semibold tracking-tight text-foreground"
      >
        {paywallTitle(requiredPlan)}
      </h1>
      <p className="text-base leading-7 text-muted-foreground">
        {paywallBody(requiredPlan, price)}
      </p>
      <a className={buttonVariants()} href="/subscription">
        {translate(planGatingMessages, 'planGating.paywall.cta')}
      </a>
    </section>
  );
}
