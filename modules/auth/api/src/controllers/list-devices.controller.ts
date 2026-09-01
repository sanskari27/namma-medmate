import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { requirePharmacySession, type AuthRuntime } from '../login/session.ts';

function locationIdFrom(req: Request): string {
  const value = req.query.location_id;
  if (typeof value !== 'string' || value.length === 0) {
    throw AuthErrors.locationIdRequired();
  }
  return value;
}

function targetUserId(req: Request, callerId: string, callerRole: string): string {
  const requested = req.query.user_id;
  if (typeof requested !== 'string' || requested.length === 0) {
    return callerId;
  }
  if (requested !== callerId && callerRole !== 'owner') {
    throw AuthErrors.forbiddenRole();
  }
  return requested;
}

export function createListDevicesController(runtime: AuthRuntime) {
  return async function listAuthDevices(_input: unknown, req: Request) {
    const { user } = await requirePharmacySession(runtime, req.headers.authorization);
    const locationId = locationIdFrom(req);
    if (locationId !== user.locationId) {
      throw AuthErrors.locationMismatch();
    }
    const userId = targetUserId(req, user.userId, user.role);
    const items = await runtime.auth.listSavedDevices(userId);
    return buildSuccess({
      items: items.map((item) => ({
        device_id: item.deviceId,
        created_at: item.createdAt.toISOString(),
        expires_at: item.expiresAt.toISOString(),
        last_used_at: item.lastUsedAt.toISOString(),
        user_agent: item.userAgent,
      })),
    });
  };
}
