import type { TenancyRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requirePharmacy } from '../auth/principal.ts';
import { TenancyErrors } from '../errors.ts';
import { toPharmacy } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseUuid } from '../http/validate.ts';

function requireMatchingLocation(input: AuthedRequest): {
  tenantId: string;
  locationId: string;
} {
  const pharmacy = requirePharmacy(input.principal);
  const raw = input.req.query.location_id;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw TenancyErrors.locationIdRequired();
  }
  const locationId = parseUuid(raw, 'location_id');
  if (locationId !== pharmacy.locationId) {
    throw TenancyErrors.locationTenantMismatch();
  }
  return { tenantId: pharmacy.tenantId, locationId };
}

export function createGetCurrentController(repository: TenancyRepository) {
  return async function getCurrent(input: AuthedRequest) {
    const { tenantId } = requireMatchingLocation(input);
    const pharmacy = await repository.getPharmacyByTenantId(tenantId);
    if (!pharmacy) {
      throw TenancyErrors.pharmacyNotFound();
    }
    return buildSuccess(toPharmacy(pharmacy));
  };
}

export { requireMatchingLocation };
