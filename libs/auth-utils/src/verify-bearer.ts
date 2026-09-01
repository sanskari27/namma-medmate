import { createHash } from 'node:crypto';
import { UnauthorizedError } from '@namma-medmate/error-handling';
import {
  verifyAccessToken,
  type JwtVerificationConfig,
  type VerifiedSession,
} from './verify-jwt.ts';

export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
export const PHARMACY_SESSION_PREFIX = 'nm_sess_';

export interface PharmacySessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  locationId: string;
  role: NonNullable<VerifiedSession['role']>;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export interface PharmacySessionLookup {
  findByTokenHash(tokenHash: string): Promise<PharmacySessionRecord | null>;
}

export function hashBearerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function verifyBearer(
  token: string,
  options: {
    oidc: JwtVerificationConfig;
    lookupPharmacySession?: PharmacySessionLookup;
    now?: Date;
  },
): Promise<VerifiedSession> {
  if (token.startsWith(PHARMACY_SESSION_PREFIX)) {
    if (!options.lookupPharmacySession) {
      throw new UnauthorizedError('Invalid access token');
    }
    const record = await options.lookupPharmacySession.findByTokenHash(hashBearerToken(token));
    const now = options.now ?? new Date();
    if (
      !record ||
      record.revokedAt ||
      now.getTime() - record.lastSeenAt.getTime() > SESSION_IDLE_MS
    ) {
      throw new UnauthorizedError('Invalid access token');
    }
    return {
      sub: record.userId,
      issuer: 'namma-pharmacy',
      audience: options.oidc.audience,
      principalType: 'pharmacy',
      tenantId: record.tenantId,
      locationId: record.locationId,
      role: record.role,
    };
  }
  return verifyAccessToken(token, options.oidc);
}
