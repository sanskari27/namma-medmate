import type { TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requirePharmacy } from '../auth/principal.ts';
import { TenancyErrors } from '../errors.ts';
import { toPharmacy } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseDisplayName, parseUuid } from '../http/validate.ts';
import { requireMatchingLocation } from './get-current.controller.ts';

export function createPatchCurrentController(repository: TenancyRepository, logger: Logger) {
  return async function patchCurrent(input: AuthedRequest) {
    const pharmacyPrincipal = requireMatchingLocation(input);
    const pharmacy = requirePharmacy(input.principal);
    if (pharmacy.role !== 'owner') {
      throw TenancyErrors.forbiddenRole();
    }
    const body = (input.req.body ?? {}) as Record<string, unknown>;
    const bodyLocationId = parseUuid(
      typeof body.location_id === 'string' ? body.location_id : undefined,
      'location_id',
    );
    if (bodyLocationId !== pharmacyPrincipal.locationId) {
      throw TenancyErrors.locationTenantMismatch();
    }
    const displayName = parseDisplayName(body.display_name);
    const updated = await repository.updateLocationDisplayName({
      tenantId: pharmacyPrincipal.tenantId,
      locationId: pharmacyPrincipal.locationId,
      displayName,
    });
    logger.info('LocationDisplayNameUpdated', {
      tenant_id: updated.tenantId,
      location_id: updated.location.locationId,
      actor_user_id: pharmacy.sub,
    });
    return buildSuccess(toPharmacy(updated));
  };
}
