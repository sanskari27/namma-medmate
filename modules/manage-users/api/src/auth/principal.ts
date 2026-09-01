import type { PharmacyRole, VerifiedSession } from '@namma-medmate/auth-utils';
import { ManageUsersErrors } from '../errors.ts';

export type PharmacyPrincipal = {
  kind: 'pharmacy';
  sub: string;
  tenantId: string;
  locationId: string;
  role: PharmacyRole;
};

export function principalFromSession(session: VerifiedSession): PharmacyPrincipal | undefined {
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

export function requirePharmacy(principal: PharmacyPrincipal | undefined): PharmacyPrincipal {
  if (principal?.kind !== 'pharmacy') {
    throw ManageUsersErrors.pharmacySessionRequired();
  }
  return principal;
}
