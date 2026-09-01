import type { ReactNode } from 'react';
import { StatusBanner } from '@namma-medmate/shared-ui';
import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';
import { Paywall } from './paywall.tsx';
import {
  useGetEntitlementsQuery,
  useGetPaywallQuery,
  type Entitlements,
} from '../store/api/plan-gating-api.ts';
import { useSelector } from 'react-redux';
import type { PlanGatingRootState } from '../store/index.ts';
import {
  freeModules,
  isAlwaysReachable,
  MIN_PLAN_FOR_MODULE,
  MONTHLY_INR,
  type PlanId,
} from '../packaging.ts';

export interface PlanGateProps {
  moduleKey: string;
  skipQuery?: boolean;
  entitlements?: Entitlements;
  children: ReactNode;
}

function fallbackEntitlements(): Entitlements {
  return {
    tenant_id: '',
    location_id: '',
    plan: 'free',
    effective_plan: 'free',
    status: 'active',
    seatsLimit: 2,
    seatsUsed: 0,
    modules: freeModules(),
    overrides: {},
  };
}

export function PlanGate({
  moduleKey,
  skipQuery = false,
  entitlements: entitlementsProp,
  children,
}: PlanGateProps) {
  const preloaded = useSelector((state: PlanGatingRootState) => state.entitlements.data);
  const query = useGetEntitlementsQuery(undefined, {
    skip: skipQuery || Boolean(entitlementsProp),
  });
  const paywallQuery = useGetPaywallQuery(moduleKey, {
    skip: skipQuery || Boolean(entitlementsProp),
  });
  const entitlements =
    entitlementsProp ?? preloaded ?? (skipQuery ? fallbackEntitlements() : query.data);

  if (!skipQuery && !entitlementsProp && query.isError) {
    return (
      <StatusBanner tone="error">
        {translate(planGatingMessages, 'planGating.errors.loadFailed')}
      </StatusBanner>
    );
  }

  if (!entitlements) {
    return isAlwaysReachable(moduleKey) ? <>{children}</> : null;
  }

  const unlocked = entitlements.modules[moduleKey] === true;
  if (unlocked || isAlwaysReachable(moduleKey)) {
    return <>{children}</>;
  }

  const requiredPlan = (paywallQuery.data?.required_plan ??
    MIN_PLAN_FOR_MODULE[moduleKey] ??
    'pro') as PlanId;
  return (
    <Paywall
      requiredPlan={requiredPlan}
      monthlyInr={paywallQuery.data?.monthly_inr ?? MONTHLY_INR[requiredPlan]}
    />
  );
}
