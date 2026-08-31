import type { PharmacyRole, VerifiedSession } from '@namma-medmate/auth-utils';
import { WhatsAppErrors } from '../errors.ts';

export type HqPrincipal = { kind: 'hq'; sub: string };
export type ServicePrincipal = { kind: 'service'; sub: string };
export type PharmacyPrincipal = {
  kind: 'pharmacy';
  sub: string;
  tenantId: string;
  locationId: string;
  role: PharmacyRole;
};
export type Principal = HqPrincipal | PharmacyPrincipal | ServicePrincipal;

export function principalFromSession(session: VerifiedSession): Principal | undefined {
  if (session.principalType === 'hq') {
    return { kind: 'hq', sub: session.sub };
  }
  if (
    session.principalType === 'pharmacy' &&
    session.tenantId &&
    session.locationId &&
    session.role
  ) {
    return {
      kind: 'pharmacy',
      sub: session.sub,
      tenantId: session.tenantId,
      locationId: session.locationId,
      role: session.role,
    };
  }
  return undefined;
}

export function requirePharmacy(principal: Principal | undefined): PharmacyPrincipal {
  if (principal?.kind !== 'pharmacy') {
    throw WhatsAppErrors.pharmacySessionRequired();
  }
  return principal;
}

export function requireOwner(principal: Principal | undefined): PharmacyPrincipal {
  const pharmacy = requirePharmacy(principal);
  if (pharmacy.role !== 'owner') {
    throw WhatsAppErrors.forbiddenRole();
  }
  return pharmacy;
}

export function requireCatalogueReader(principal: Principal | undefined): Principal {
  if (principal?.kind !== 'pharmacy' && principal?.kind !== 'hq') {
    throw WhatsAppErrors.hqOnly();
  }
  return principal;
}
