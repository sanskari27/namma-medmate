import { timingSafeEqual } from 'node:crypto';
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
import type { MasterCatalogueEnv } from '../config/env.ts';
import { principalFromSession, type Principal } from '../auth/principal.ts';

export interface AuthedRequest {
  principal: Principal | undefined;
  session?: VerifiedSession;
  req: Request;
}

function tokensMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAuthParser(env: MasterCatalogueEnv) {
  return async function parseAuth(req: Request): Promise<AuthedRequest> {
    const headers = parseAuthorizationHeader(req);
    validateAuthorizationHeader(headers);
    const token = extractBearerToken(headers.authorization);
    if (tokensMatch(token, env.MASTER_CATALOGUE_SERVICE_TOKEN)) {
      return { principal: { kind: 'service', sub: 'master-catalogue-service' }, req };
    }
    const session = await verifyAccessToken(token, {
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
      jwksUri: env.OIDC_JWKS_URI,
    });
    return { principal: principalFromSession(session), session, req };
  };
}
