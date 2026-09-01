import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { toSessionPayload } from '../http/mappers.ts';
import { requirePharmacySession, type AuthRuntime } from '../login/session.ts';

export function createGetSessionController(runtime: AuthRuntime) {
  return async function getAuthSession(_input: unknown, req: Request) {
    const { session, user } = await requirePharmacySession(runtime, req.headers.authorization);
    await runtime.auth.touchSession(session.sessionId, runtime.now());
    return buildSuccess(toSessionPayload(user, session.sessionId));
  };
}
