import {
  extractBearerToken,
  mapVerifiedSession,
  verifyAccessToken,
  type SessionIdentity,
} from '@namma-medmate/auth-utils';
import type { AuthorizationInput } from '@namma-medmate/lambda-bootstrap';
import type { SuccessEnvelope } from '@namma-medmate/response-envelope';
import type { AuthEnv } from '../config/env.ts';

export function createGetSessionController(env: AuthEnv) {
  return async function getSession(
    input: AuthorizationInput,
  ): Promise<SuccessEnvelope<SessionIdentity>> {
    const token = extractBearerToken(input.authorization);
    const session = await verifyAccessToken(token, {
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
      jwksUri: env.OIDC_JWKS_URI,
    });
    return mapVerifiedSession(session);
  };
}
