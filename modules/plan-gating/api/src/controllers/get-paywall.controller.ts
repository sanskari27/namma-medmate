import type { TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { catalogueItem, GST_NOTE, isModuleKey, minimumPlanForModule } from '../catalogue.ts';
import type { OverrideReader } from '../deps/overrides.ts';
import type { SeatsReader } from '../deps/seats.ts';
import type { SubscriptionReader } from '../deps/subscription.ts';
import { computeEntitlements } from '../entitlements.ts';
import { PlanGatingErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';

export function createGetPaywallController(deps: {
  tenancy: TenancyRepository;
  subscriptions: SubscriptionReader;
  overrides: OverrideReader;
  seats: SeatsReader;
  logger: Logger;
}) {
  return async function getPaywall(input: AuthedRequest) {
    const pharmacy = await requirePharmacyLocation(
      input,
      deps.tenancy,
      input.req.query.location_id,
    );
    const rawKey = input.req.query.module_key;
    if (typeof rawKey !== 'string' || !isModuleKey(rawKey)) {
      throw PlanGatingErrors.unknownModule();
    }
    const entitlements = await computeEntitlements({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      subscriptions: deps.subscriptions,
      overrides: deps.overrides,
      seats: deps.seats,
      logger: deps.logger,
    });
    const requiredPlan = minimumPlanForModule(rawKey);
    const item = catalogueItem(requiredPlan);
    return buildSuccess({
      module_key: rawKey,
      unlocked: entitlements.modules[rawKey],
      required_plan: requiredPlan,
      required_plan_label_i18n: item.label_i18n,
      monthly_inr: item.monthly_inr,
      gst_note: GST_NOTE,
      title_i18n: 'planGating.paywall.title',
      body_i18n: 'planGating.paywall.body',
    });
  };
}
