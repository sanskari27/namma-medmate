import type { PharmacyRole, VerifiedSession } from '@namma-medmate/auth-utils';
import { MasterCatalogueErrors } from '../errors.ts';

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

export function requireHq(principal: Principal | undefined): HqPrincipal {
  if (principal?.kind !== 'hq') {
    throw MasterCatalogueErrors.hqOnly();
  }
  return principal;
}

export function requireReadable(
  principal: Principal | undefined,
): HqPrincipal | PharmacyPrincipal | ServicePrincipal {
  if (principal?.kind !== 'hq' && principal?.kind !== 'pharmacy' && principal?.kind !== 'service') {
    throw MasterCatalogueErrors.forbidden();
  }
  return principal;
}
