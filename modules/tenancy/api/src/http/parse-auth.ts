import type { Request } from 'express';
import {
  extractBearerToken,
  verifyAccessToken,
  type VerifiedSession,
} from '@namma-medmate/auth-utils';
import {
  parseAuthorizationHeader,
  validateAuthorizationHeader,
} from '@namma-medmate/lambda-bootstrap';
import type { TenancyEnv } from '../config/env.ts';
import { principalFromSession, type Principal } from '../auth/principal.ts';

export interface AuthedRequest {
  principal: Principal | undefined;
  session: VerifiedSession;
  req: Request;
}

export function createAuthParser(env: TenancyEnv) {
  return async function parseAuth(req: Request): Promise<AuthedRequest> {
    const headers = parseAuthorizationHeader(req);
    validateAuthorizationHeader(headers);
    const token = extractBearerToken(headers.authorization);
    const session = await verifyAccessToken(token, {
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
      jwksUri: env.OIDC_JWKS_URI,
    });
    return { principal: principalFromSession(session), session, req };
  };
}
