import type { PharmacyRole, VerifiedSession } from '@namma-medmate/auth-utils';
import { GoLiveKycErrors } from '../errors.ts';

export type HqPrincipal = { kind: 'hq'; sub: string };
export type PharmacyPrincipal = {
  kind: 'pharmacy';
  sub: string;
  tenantId: string;
  locationId: string;
  role: PharmacyRole;
};
export type Principal = HqPrincipal | PharmacyPrincipal;

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
    throw GoLiveKycErrors.pharmacySessionRequired();
  }
  return principal;
}

export function requireHq(principal: Principal | undefined): HqPrincipal {
  if (principal?.kind !== 'hq') {
    throw GoLiveKycErrors.hqOnly();
  }
  return principal;
}
