import { buildSuccess } from '@namma-medmate/response-envelope';
import type { TenancyRepository } from '@namma-medmate/db-services';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { resolveScopedPair } from '../http/scope.ts';
import { resolveLocation } from '../tenancy/resolve-location.ts';
import { buildShareDeeplink } from '../share/deeplink.ts';

export function createShareDeeplinkController(tenancy: TenancyRepository) {
  return async function shareDeeplink(input: AuthedRequest) {
    const body = input.req.body as Record<string, unknown>;
    const { tenantId, locationId } = resolveScopedPair(
      input.principal,
      body.tenant_id,
      body.location_id,
    );
    await resolveLocation(tenancy, tenantId, locationId);
    return buildSuccess(buildShareDeeplink({ to: body.to, text: body.text }));
  };
}
