import { buildSuccess, type SuccessEnvelope } from '@namma-medmate/response-envelope';
import type { VerifiedSession } from './verify-jwt.ts';

export interface SessionIdentity {
  authenticated: true;
  sub: string;
}

export function mapVerifiedSession(session: VerifiedSession): SuccessEnvelope<SessionIdentity> {
  return buildSuccess({
    authenticated: true as const,
    sub: session.sub,
  });
}
