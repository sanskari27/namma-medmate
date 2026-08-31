import type { Principal } from '../auth/principal.ts';
import { WhatsAppErrors } from '../errors.ts';
import { parseUuid } from './validate.ts';

export function resolveScopedPair(
  principal: Principal | undefined,
  tenantIdRaw: unknown,
  locationIdRaw: unknown,
): { tenantId: string; locationId: string } {
  const tenantId = parseUuid(
    typeof tenantIdRaw === 'string' ? tenantIdRaw : undefined,
    'tenant_id',
  );
  const locationId = parseUuid(
    typeof locationIdRaw === 'string' ? locationIdRaw : undefined,
    'location_id',
  );
  if (principal?.kind === 'pharmacy') {
    if (principal.tenantId !== tenantId || principal.locationId !== locationId) {
      throw WhatsAppErrors.locationTenantMismatch();
    }
  } else if (principal?.kind !== 'hq' && principal?.kind !== 'service') {
    throw WhatsAppErrors.pharmacySessionRequired();
  }
  return { tenantId, locationId };
}

export function requirePharmacyLocation(
  principal: Principal | undefined,
  locationIdRaw: unknown,
): { tenantId: string; locationId: string } {
  if (typeof locationIdRaw !== 'string' || locationIdRaw.length === 0) {
    throw WhatsAppErrors.locationIdRequired();
  }
  const locationId = parseUuid(locationIdRaw, 'location_id');
  if (principal?.kind !== 'pharmacy') {
    throw WhatsAppErrors.pharmacySessionRequired();
  }
  if (principal.locationId !== locationId) {
    throw WhatsAppErrors.locationTenantMismatch();
  }
  return { tenantId: principal.tenantId, locationId };
}
