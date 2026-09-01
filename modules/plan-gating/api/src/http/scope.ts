import type { TenancyRepository } from '@namma-medmate/db-services';
import { requirePharmacy, type PharmacyPrincipal } from '../auth/principal.ts';
import { PlanGatingErrors } from '../errors.ts';
import type { AuthedRequest } from './parse-auth.ts';
import { parseUuid } from './validate.ts';

export function readLocationId(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw PlanGatingErrors.locationIdRequired();
  }
  return parseUuid(raw, 'location_id');
}

export async function requirePharmacyLocation(
  input: AuthedRequest,
  tenancy: TenancyRepository,
  rawLocationId: unknown,
): Promise<PharmacyPrincipal> {
  const pharmacy = requirePharmacy(input.principal);
  const locationId = readLocationId(rawLocationId);
  if (locationId !== pharmacy.locationId) {
    throw PlanGatingErrors.locationTenantMismatch();
  }
  const location = await tenancy.getLocationForTenant(pharmacy.tenantId);
  if (!location || location.locationId !== locationId) {
    throw PlanGatingErrors.locationTenantMismatch();
  }
  return pharmacy;
}
