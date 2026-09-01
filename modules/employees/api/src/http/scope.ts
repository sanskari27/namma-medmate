import type { TenancyRepository, UserRecord } from '@namma-medmate/db-services';
import { requirePharmacy, type PharmacyPrincipal } from '../auth/principal.ts';
import { canManageEmployees, canReadPharmacistEligible } from '../permissions.ts';
import { EmployeesErrors } from '../errors.ts';
import type { AuthedRequest } from './parse-auth.ts';
import { readLocationId } from './validate.ts';

export async function requirePharmacyLocation(
  input: AuthedRequest,
  tenancy: TenancyRepository,
  rawLocationId: unknown,
): Promise<PharmacyPrincipal> {
  const pharmacy = requirePharmacy(input.principal);
  const locationId = readLocationId(rawLocationId);
  if (locationId !== pharmacy.locationId) {
    throw EmployeesErrors.notFound();
  }
  const location = await tenancy.getLocationForTenant(pharmacy.tenantId);
  if (!location || location.locationId !== locationId) {
    throw EmployeesErrors.notFound();
  }
  return pharmacy;
}

export function requireEmployeesPermission(actor: UserRecord): void {
  if (!canManageEmployees(actor.role, actor.permissions)) {
    throw EmployeesErrors.forbidden();
  }
}

export function requirePharmacistEligiblePermission(actor: UserRecord): void {
  if (!canReadPharmacistEligible(actor.role, actor.permissions)) {
    throw EmployeesErrors.forbidden();
  }
}
