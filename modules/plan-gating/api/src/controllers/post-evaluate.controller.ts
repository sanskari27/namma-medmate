import type { TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { isModuleKey, isStaffRole, roleAllows } from '../catalogue.ts';
import type { OverrideReader } from '../deps/overrides.ts';
import type { SeatsReader } from '../deps/seats.ts';
import type { SubscriptionReader } from '../deps/subscription.ts';
import { computeEntitlements } from '../entitlements.ts';
import { PlanGatingErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';
import { parseUuid } from '../http/validate.ts';

export function createPostEvaluateController(deps: {
  tenancy: TenancyRepository;
  subscriptions: SubscriptionReader;
  overrides: OverrideReader;
  seats: SeatsReader;
  logger: Logger;
}) {
  return async function postEvaluate(input: AuthedRequest) {
    const body = input.req.body as Record<string, unknown>;
    const pharmacy = await requirePharmacyLocation(input, deps.tenancy, body.location_id);
    const bodyTenantId = parseUuid(
      typeof body.tenant_id === 'string' ? body.tenant_id : '',
      'tenant_id',
    );
    if (bodyTenantId !== pharmacy.tenantId) {
      throw PlanGatingErrors.locationTenantMismatch();
    }
    if (typeof body.module_key !== 'string' || !isModuleKey(body.module_key)) {
      throw PlanGatingErrors.unknownModule();
    }
    if (typeof body.role !== 'string' || !isStaffRole(body.role)) {
      throw PlanGatingErrors.validationFailed('role is required');
    }
    const ticks =
      body.ticks && typeof body.ticks === 'object' && !Array.isArray(body.ticks)
        ? (body.ticks as Record<string, boolean>)
        : {};
    const entitlements = await computeEntitlements({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      subscriptions: deps.subscriptions,
      overrides: deps.overrides,
      seats: deps.seats,
      logger: deps.logger,
    });
    if (!entitlements.modules[body.module_key]) {
      return buildSuccess({ allowed: false, reason: 'plan_locked' as const });
    }
    if (!roleAllows(body.role, body.module_key, ticks)) {
      return buildSuccess({ allowed: false, reason: 'role_denied' as const });
    }
    return buildSuccess({ allowed: true, reason: 'ok' as const });
  };
}
