import type { Logger } from '@namma-medmate/logger';
import {
  catalogueItem,
  isOverrideFalseProtected,
  modulesForPlan,
  type ModuleKey,
  type PlanId,
} from './catalogue.ts';
import type { OverrideReader } from './deps/overrides.ts';
import type { SeatsReader } from './deps/seats.ts';
import type { SaasSubscription, SubscriptionReader } from './deps/subscription.ts';

export type SubscriptionStatus = 'active' | 'expired';

export interface Entitlements {
  tenant_id: string;
  location_id: string;
  plan: PlanId;
  effective_plan: PlanId;
  status: SubscriptionStatus;
  seatsLimit: number | null;
  seatsUsed: number;
  seats_used_unknown?: boolean;
  modules: Record<ModuleKey, boolean>;
  overrides: Record<string, boolean>;
}

const EXPIRED_STATUSES = new Set(['expired', 'past_due', 'suspended']);

export function effectiveFromSubscription(subscription: SaasSubscription | undefined): {
  plan: PlanId;
  effectivePlan: PlanId;
  status: SubscriptionStatus;
} {
  if (!subscription) {
    return { plan: 'free', effectivePlan: 'free', status: 'active' };
  }
  if (EXPIRED_STATUSES.has(subscription.status) || subscription.plan === 'free') {
    const status: SubscriptionStatus =
      subscription.plan === 'free' && subscription.status === 'active' ? 'active' : 'expired';
    if (subscription.plan === 'free' && subscription.status === 'active') {
      return { plan: 'free', effectivePlan: 'free', status: 'active' };
    }
    return { plan: subscription.plan, effectivePlan: 'free', status };
  }
  return { plan: subscription.plan, effectivePlan: subscription.plan, status: 'active' };
}

function applyOverrides(
  modules: Record<ModuleKey, boolean>,
  overrides: Record<string, boolean>,
): Record<ModuleKey, boolean> {
  const next = { ...modules };
  for (const [rawKey, enabled] of Object.entries(overrides)) {
    if (!(rawKey in next)) {
      continue;
    }
    const key = rawKey as ModuleKey;
    if (enabled === false && isOverrideFalseProtected(key)) {
      continue;
    }
    next[key] = enabled;
  }
  return next;
}

export async function computeEntitlements(input: {
  tenantId: string;
  locationId: string;
  subscriptions: SubscriptionReader;
  overrides: OverrideReader;
  seats: SeatsReader;
  logger: Logger;
}): Promise<Entitlements> {
  let subscription: SaasSubscription | undefined;
  try {
    subscription = await input.subscriptions.getSubscription(input.tenantId);
  } catch (error) {
    input.logger.error('saas-billing unavailable, treating as Free', {
      tenantId: input.tenantId,
      err: String(error),
    });
    subscription = undefined;
  }

  const { plan, effectivePlan, status } = effectiveFromSubscription(subscription);
  let overrides: Record<string, boolean> = {};
  try {
    overrides = await input.overrides.getOverrides(input.tenantId);
  } catch (error) {
    input.logger.error('module overrides unavailable', {
      tenantId: input.tenantId,
      err: String(error),
    });
  }

  const modules = applyOverrides(modulesForPlan(effectivePlan), overrides);
  const listedOverrides: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key in modules) {
      listedOverrides[key] = value;
    }
  }

  let seatsUsed = 0;
  let seatsUnknown = false;
  try {
    const seats = await input.seats.getSeatsUsed(input.tenantId, input.locationId);
    seatsUsed = seats.seatsUsed;
    seatsUnknown = seats.unknown;
  } catch (error) {
    input.logger.warn('manage-users seats unavailable, seatsUsed=0', {
      tenantId: input.tenantId,
      err: String(error),
    });
    seatsUsed = 0;
    seatsUnknown = true;
  }

  const result: Entitlements = {
    tenant_id: input.tenantId,
    location_id: input.locationId,
    plan,
    effective_plan: effectivePlan,
    status,
    seatsLimit: catalogueItem(effectivePlan).seats_limit,
    seatsUsed,
    modules,
    overrides: listedOverrides,
  };
  if (seatsUnknown) {
    result.seats_used_unknown = true;
  }
  return result;
}
