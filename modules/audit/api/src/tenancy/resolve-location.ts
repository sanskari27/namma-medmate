import type { LocationRecord, TenancyRepository } from '@namma-medmate/db-services';
import { AuditErrors } from '../errors.ts';

export async function resolveLocation(
  tenancy: TenancyRepository,
  tenantId: string,
  locationId: string,
): Promise<LocationRecord> {
  const location = await tenancy.getLocationById(locationId);
  if (!location) {
    throw AuditErrors.locationNotFound();
  }
  if (location.tenantId !== tenantId) {
    throw AuditErrors.locationTenantMismatch();
  }
  return location;
}
