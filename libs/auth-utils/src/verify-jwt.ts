import * as jose from 'jose';
import { UnauthorizedError } from '@namma-medmate/error-handling';

export interface JwtVerificationConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  clockToleranceSeconds?: number;
}

export type PrincipalType = 'hq' | 'pharmacy';
export type PharmacyRole = 'owner' | 'manager' | 'pharmacist' | 'cashier';

export interface VerifiedSession {
  sub: string;
  issuer: string;
  audience: string | string[];
  principalType?: PrincipalType;
  tenantId?: string;
  locationId?: string;
  role?: PharmacyRole;
}

const PRINCIPAL_TYPES = new Set<PrincipalType>(['hq', 'pharmacy']);
const PHARMACY_ROLES = new Set<PharmacyRole>(['owner', 'manager', 'pharmacist', 'cashier']);

const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

export function getRemoteJwks(jwksUri: string): ReturnType<typeof jose.createRemoteJWKSet> {
  const cached = jwksCache.get(jwksUri);
  if (cached) {
    return cached;
  }
  const jwks = jose.createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, jwks);
  return jwks;
}

export function resetJwksCache(): void {
  jwksCache.clear();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalPrincipalType(value: unknown): PrincipalType | undefined {
  return typeof value === 'string' && PRINCIPAL_TYPES.has(value as PrincipalType)
    ? (value as PrincipalType)
    : undefined;
}

function optionalRole(value: unknown): PharmacyRole | undefined {
  return typeof value === 'string' && PHARMACY_ROLES.has(value as PharmacyRole)
    ? (value as PharmacyRole)
    : undefined;
}

export async function verifyAccessToken(
  token: string,
  config: JwtVerificationConfig,
): Promise<VerifiedSession> {
  try {
    const { payload } = await jose.jwtVerify(token, getRemoteJwks(config.jwksUri), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
      clockTolerance: config.clockToleranceSeconds ?? 5,
    });
    if (!payload.sub) {
      throw new UnauthorizedError('Token is missing sub');
    }
    return {
      sub: payload.sub,
      issuer: config.issuer,
      audience: config.audience,
      principalType: optionalPrincipalType(payload.principal_type),
      tenantId: optionalString(payload.tenant_id),
      locationId: optionalString(payload.location_id),
      role: optionalRole(payload.role),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
