import type { Request } from 'express';
import {
  extractBearerToken,
  verifyBearer,
  type PharmacySessionLookup,
  type VerifiedSession,
} from '@namma-medmate/auth-utils';
import {
  parseAuthorizationHeader,
  validateAuthorizationHeader,
} from '@namma-medmate/lambda-bootstrap';
import type { GoLiveKycEnv } from '../config/env.ts';
import { principalFromSession, type Principal } from '../auth/principal.ts';

export interface AuthedRequest {
  principal: Principal | undefined;
  session: VerifiedSession;
  accessToken: string;
  req: Request;
}

export function createAuthParser(env: GoLiveKycEnv, lookupPharmacySession?: PharmacySessionLookup) {
  return async function parseAuth(req: Request): Promise<AuthedRequest> {
    const headers = parseAuthorizationHeader(req);
    validateAuthorizationHeader(headers);
    const token = extractBearerToken(headers.authorization);
    const session = await verifyBearer(token, {
      oidc: {
        issuer: env.OIDC_ISSUER,
        audience: env.OIDC_AUDIENCE,
        jwksUri: env.OIDC_JWKS_URI,
      },
      lookupPharmacySession,
    });
    return { principal: principalFromSession(session), session, accessToken: token, req };
  };
}
