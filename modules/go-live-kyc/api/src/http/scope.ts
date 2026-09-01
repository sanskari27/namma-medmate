import type { GoLiveKycRecord, TenancyRepository } from '@namma-medmate/db-services';
import {
  requireHq,
  requirePharmacy,
  type HqPrincipal,
  type PharmacyPrincipal,
} from '../auth/principal.ts';
import { GoLiveKycErrors } from '../errors.ts';
import type { AuthedRequest } from './parse-auth.ts';
import { parseUuid, readLocationId } from './validate.ts';

export async function requirePharmacyLocation(
  input: AuthedRequest,
  tenancy: TenancyRepository,
  rawLocationId: unknown,
): Promise<PharmacyPrincipal> {
  const pharmacy = requirePharmacy(input.principal);
  const locationId = readLocationId(rawLocationId);
  if (locationId !== pharmacy.locationId) {
    throw GoLiveKycErrors.notFound();
  }
  const location = await tenancy.getLocationForTenant(pharmacy.tenantId);
  if (!location || location.locationId !== locationId) {
    throw GoLiveKycErrors.notFound();
  }
  return pharmacy;
}

export function requireOwner(principal: PharmacyPrincipal): void {
  if (principal.role !== 'owner') {
    throw GoLiveKycErrors.ownerOnly();
  }
}

export async function requireHqLocation(
  input: AuthedRequest,
  tenancy: TenancyRepository,
  tenantIdRaw: string,
  rawLocationId: unknown,
): Promise<{ hq: HqPrincipal; tenantId: string; locationId: string; pharmacyName: string }> {
  const hq = requireHq(input.principal);
  const tenantId = parseUuid(tenantIdRaw, 'tenant_id');
  const locationId = readLocationId(rawLocationId);
  const pharmacy = await tenancy.getPharmacyByTenantId(tenantId);
  if (!pharmacy || pharmacy.location.locationId !== locationId) {
    throw GoLiveKycErrors.notFound();
  }
  return { hq, tenantId, locationId, pharmacyName: pharmacy.location.displayName };
}

export function requireExisting(row: GoLiveKycRecord | undefined): GoLiveKycRecord {
  if (!row) {
    throw GoLiveKycErrors.notFound();
  }
  return row;
}
