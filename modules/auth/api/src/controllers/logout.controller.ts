import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { recordAudit } from '../audit/record.ts';
import { ROLE_LABEL } from '../http/mappers.ts';
import { requirePharmacySession, type AuthRuntime } from '../login/session.ts';

export function createLogoutController(runtime: AuthRuntime) {
  return async function logoutSession(_input: unknown, req: Request) {
    const { session, user } = await requirePharmacySession(runtime, req.headers.authorization);
    await runtime.auth.revokeSession(session.sessionId, runtime.now());
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'session_revoked',
      tenantId: user.tenantId,
      locationId: user.locationId,
      actorUserId: user.userId,
      actorRole: ROLE_LABEL[user.role],
      targetId: user.userId,
      after: { session_id: session.sessionId },
      idempotencyKey: `session_revoked-${session.sessionId}`,
    });
    return buildSuccess({ revoked: true });
  };
}
