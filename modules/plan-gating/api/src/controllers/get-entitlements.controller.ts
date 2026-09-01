import type { TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { computeEntitlements } from '../entitlements.ts';
import type { OverrideReader } from '../deps/overrides.ts';
import type { SeatsReader } from '../deps/seats.ts';
import type { SubscriptionReader } from '../deps/subscription.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';

export function createGetEntitlementsController(deps: {
  tenancy: TenancyRepository;
  subscriptions: SubscriptionReader;
  overrides: OverrideReader;
  seats: SeatsReader;
  logger: Logger;
}) {
  return async function getEntitlements(input: AuthedRequest) {
    const pharmacy = await requirePharmacyLocation(
      input,
      deps.tenancy,
      input.req.query.location_id,
    );
    const data = await computeEntitlements({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      subscriptions: deps.subscriptions,
      overrides: deps.overrides,
      seats: deps.seats,
      logger: deps.logger,
    });
    return buildSuccess(data);
  };
}
