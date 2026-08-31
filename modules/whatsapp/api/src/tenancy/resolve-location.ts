import type { LocationRecord, TenancyRepository } from '@namma-medmate/db-services';
import { WhatsAppErrors } from '../errors.ts';

export async function resolveLocation(
  tenancy: TenancyRepository,
  tenantId: string,
  locationId: string,
): Promise<LocationRecord> {
  const location = await tenancy.getLocationById(locationId);
  if (!location) {
    throw WhatsAppErrors.locationNotFound();
  }
  if (location.tenantId !== tenantId) {
    throw WhatsAppErrors.locationTenantMismatch();
  }
  return location;
}
