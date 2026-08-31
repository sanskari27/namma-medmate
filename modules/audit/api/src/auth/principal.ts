import type { PharmacyRole, VerifiedSession } from '@namma-medmate/auth-utils';
import { AuditErrors } from '../errors.ts';

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

export function requireService(principal: Principal | undefined): ServicePrincipal {
  if (principal?.kind !== 'service') {
    throw AuditErrors.serviceOnly();
  }
  return principal;
}

export function requireQueryPrincipal(
  principal: Principal | undefined,
): HqPrincipal | PharmacyPrincipal {
  if (principal?.kind !== 'pharmacy' && principal?.kind !== 'hq') {
    throw AuditErrors.hqOrPharmacyRequired();
  }
  return principal;
}

export function requirePharmacy(principal: Principal | undefined): PharmacyPrincipal {
  if (principal?.kind !== 'pharmacy') {
    throw AuditErrors.pharmacySessionRequired();
  }
  return principal;
}
