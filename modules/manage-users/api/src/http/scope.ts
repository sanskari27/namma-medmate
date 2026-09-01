import type { TenancyRepository, UserRecord } from '@namma-medmate/db-services';
import { requirePharmacy, type PharmacyPrincipal } from '../auth/principal.ts';
import { canManageUsers } from '../permissions.ts';
import { ManageUsersErrors } from '../errors.ts';
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
    throw ManageUsersErrors.notFound();
  }
  const location = await tenancy.getLocationForTenant(pharmacy.tenantId);
  if (!location || location.locationId !== locationId) {
    throw ManageUsersErrors.notFound();
  }
  return pharmacy;
}

export function requireManageUsersPermission(actor: UserRecord): void {
  if (!canManageUsers(actor.role, actor.permissions)) {
    throw ManageUsersErrors.forbidden();
  }
}

export function scopedUser(
  user: UserRecord | undefined,
  tenantId: string,
  locationId: string,
): UserRecord {
  if (!user || user.removedAt || user.tenantId !== tenantId || user.locationId !== locationId) {
    throw ManageUsersErrors.notFound();
  }
  return user;
}
