import * as jose from 'jose';
import { UnauthorizedError } from '@namma-medmate/error-handling';

export interface JwtVerificationConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  clockToleranceSeconds?: number;
}

export interface VerifiedSession {
  sub: string;
  issuer: string;
  audience: string | string[];
}

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
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
