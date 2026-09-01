import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { recordAudit } from '../audit/record.ts';
import { ROLE_LABEL } from '../http/mappers.ts';
import { requirePharmacySession, type AuthRuntime } from '../login/session.ts';

function locationIdFrom(req: Request): string {
  const value = req.query.location_id;
  if (typeof value !== 'string' || value.length === 0) {
    throw AuthErrors.locationIdRequired();
  }
  return value;
}

export function createRevokeDevicesController(runtime: AuthRuntime) {
  return async function revokeAuthDevices(_input: unknown, req: Request) {
    const { user } = await requirePharmacySession(runtime, req.headers.authorization);
    const locationId = locationIdFrom(req);
    if (locationId !== user.locationId) {
      throw AuthErrors.locationMismatch();
    }
    const requested = req.query.user_id;
    const userId = typeof requested === 'string' && requested.length > 0 ? requested : user.userId;
    if (userId !== user.userId && user.role !== 'owner') {
      throw AuthErrors.forbiddenRole();
    }
    const revokedCount = await runtime.auth.revokeAllSavedDevices(userId);
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'saved_devices_revoked',
      tenantId: user.tenantId,
      locationId: user.locationId,
      actorUserId: user.userId,
      actorRole: ROLE_LABEL[user.role],
      targetId: userId,
      after: { revoked_count: revokedCount },
      idempotencyKey: `saved_devices_revoked-${userId}-${runtime.now().toISOString()}`,
    });
    return buildSuccess({ revoked_count: revokedCount });
  };
}
