import type { Principal } from '../auth/principal.ts';
import { AuditErrors } from '../errors.ts';
import { parseOptionalUuid, parseUuid } from './validate.ts';

export function requirePharmacyLocation(
  principal: Principal | undefined,
  locationIdRaw: unknown,
): { tenantId: string; locationId: string } {
  if (typeof locationIdRaw !== 'string' || locationIdRaw.length === 0) {
    throw AuditErrors.locationIdRequired();
  }
  const locationId = parseUuid(locationIdRaw, 'location_id');
  if (principal?.kind !== 'pharmacy') {
    throw AuditErrors.pharmacySessionRequired();
  }
  if (principal.locationId !== locationId) {
    throw AuditErrors.locationTenantMismatch();
  }
  return { tenantId: principal.tenantId, locationId };
}

export function resolveQueryScope(
  principal: Principal | undefined,
  tenantIdRaw: unknown,
  locationIdRaw: unknown,
): { tenantId?: string | null; locationId?: string | null; platformOnly: boolean } {
  if (principal?.kind === 'pharmacy') {
    const { tenantId, locationId } = requirePharmacyLocation(principal, locationIdRaw);
    return { tenantId, locationId, platformOnly: false };
  }
  if (principal?.kind !== 'hq') {
    throw AuditErrors.hqOrPharmacyRequired();
  }
  const tenantId = parseOptionalUuid(tenantIdRaw, 'tenant_id');
  const locationId = parseOptionalUuid(locationIdRaw, 'location_id');
  if (tenantId && !locationId) {
    throw AuditErrors.locationIdRequired();
  }
  if (locationId && !tenantId) {
    throw AuditErrors.validationFailed('tenant_id is required with location_id');
  }
  if (!tenantId && !locationId) {
    return { platformOnly: true };
  }
  return { tenantId, locationId, platformOnly: false };
}
