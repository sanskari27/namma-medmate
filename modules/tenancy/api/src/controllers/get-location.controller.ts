import type { TenancyRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { TenancyErrors } from '../errors.ts';
import { toLocationIdentity } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseUuid } from '../http/validate.ts';

export function createGetLocationController(repository: TenancyRepository) {
  return async function getLocation(input: AuthedRequest) {
    const locationId = parseUuid(input.req.params.location_id, 'location_id');
    const tenantId = parseUuid(
      typeof input.req.query.tenant_id === 'string' ? input.req.query.tenant_id : undefined,
      'tenant_id',
    );
    if (input.principal?.kind === 'pharmacy') {
      if (input.principal.tenantId !== tenantId || input.principal.locationId !== locationId) {
        throw TenancyErrors.locationTenantMismatch();
      }
    } else if (input.principal?.kind !== 'hq') {
      throw TenancyErrors.hqOnly();
    }
    const location = await repository.getLocationById(locationId);
    if (!location) {
      throw TenancyErrors.locationNotFound();
    }
    if (location.tenantId !== tenantId) {
      throw TenancyErrors.locationTenantMismatch();
    }
    return buildSuccess(toLocationIdentity(location));
  };
}
