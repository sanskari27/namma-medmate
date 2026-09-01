import { hashBearerToken } from '@namma-medmate/auth-utils';
import type { UserRecord } from '@namma-medmate/db-services';
import { verifySecret } from '@namma-medmate/encryption-utils';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { isPinPurpose, ROLE_LABEL } from '../http/mappers.ts';
import { recordAudit } from '../audit/record.ts';
import {
  DEVICE_TOKEN_PREFIX,
  KIOSK_LOCK_MS,
  MAX_FAILURES,
  PIN_VERIFY_TTL_MS,
  assertActive,
  assertUnlocked,
  issueLoginSession,
  readBody,
  readString,
  recordSharedFailure,
  requirePharmacySession,
  requireUserByLogin,
  type AuthRuntime,
} from '../login/session.ts';

function pinLooksValid(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function createVerifyPinController(runtime: AuthRuntime) {
  return async function verifyPin(_input: unknown, req: Request) {
    const body = readBody(req);
    const purposeValue = body.purpose;
    if (!isPinPurpose(purposeValue)) {
      throw AuthErrors.validationFailed('purpose is required');
    }
    const pin = readString(body, 'pin');
    if (!pinLooksValid(pin)) {
      throw AuthErrors.invalidPinFormat();
    }
    if (purposeValue === 'saved_device_unlock') {
      return unlockSavedDevice(runtime, body, pin);
    }
    const authed = await requirePharmacySession(runtime, req.headers.authorization);
    assertActive(authed.user);
    if (!authed.user.pinHash) {
      throw AuthErrors.pinNotSet();
    }
    if (purposeValue === 'kiosk_exit') {
      return verifyKioskPin(runtime, authed.user, authed.user.pinHash, pin, body);
    }
    assertUnlocked(authed.user, runtime.now());
    if (!(await verifySecret(authed.user.pinHash, pin))) {
      return recordSharedFailure(runtime, authed.user, 'pin_failed');
    }
    const verification = await runtime.auth.createPinVerification({
      userId: authed.user.userId,
      purpose: purposeValue,
      expiresAt: new Date(runtime.now().getTime() + PIN_VERIFY_TTL_MS),
    });
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'pin_verified',
      tenantId: authed.user.tenantId,
      locationId: authed.user.locationId,
      actorUserId: authed.user.userId,
      actorRole: ROLE_LABEL[authed.user.role],
      targetId: authed.user.userId,
      after: { purpose: purposeValue },
      idempotencyKey: `pin_verified-${verification.verificationId}`,
    });
    return buildSuccess({
      verified: true,
      verification_id: verification.verificationId,
      purpose: purposeValue,
      session_token: null,
    });
  };
}

async function unlockSavedDevice(runtime: AuthRuntime, body: Record<string, unknown>, pin: string) {
  const loginId = readString(body, 'login_id');
  const deviceToken = readString(body, 'device_token');
  if (!deviceToken.startsWith(DEVICE_TOKEN_PREFIX)) {
    throw AuthErrors.invalidDevice();
  }
  const user = await requireUserByLogin(runtime, loginId);
  assertActive(user);
  assertUnlocked(user, runtime.now());
  if (!user.pinHash) {
    throw AuthErrors.pinNotSet();
  }
  const device = await runtime.auth.findSavedDeviceByTokenHash(hashBearerToken(deviceToken));
  if (!device || device.userId !== user.userId) {
    throw AuthErrors.invalidDevice();
  }
  if (device.expiresAt.getTime() <= runtime.now().getTime()) {
    throw AuthErrors.deviceExpired();
  }
  if (!(await verifySecret(user.pinHash, pin))) {
    return recordSharedFailure(runtime, user, 'pin_failed');
  }
  await runtime.auth.touchSavedDevice(device.deviceId, runtime.now());
  const login = await issueLoginSession(runtime, user, false);
  return buildSuccess({
    verified: true,
    verification_id: null,
    purpose: 'saved_device_unlock' as const,
    ...login,
  });
}

async function verifyKioskPin(
  runtime: AuthRuntime,
  user: UserRecord,
  pinHash: string,
  pin: string,
  body: Record<string, unknown>,
) {
  const kioskSessionId =
    typeof body.kiosk_session_id === 'string' && body.kiosk_session_id.length > 0
      ? body.kiosk_session_id
      : 'kiosk';
  const now = runtime.now();
  const attempt = await runtime.auth.getKioskPinAttempt(kioskSessionId, user.userId);
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > now.getTime()) {
    throw AuthErrors.kioskPinLocked(attempt.lockedUntil.toISOString());
  }
  if (!(await verifySecret(pinHash, pin))) {
    const failedAttempts = (attempt?.failedAttempts ?? 0) + 1;
    const lockedUntil =
      failedAttempts >= MAX_FAILURES ? new Date(now.getTime() + KIOSK_LOCK_MS) : null;
    await runtime.auth.upsertKioskPinAttempt({
      kioskSessionId,
      userId: user.userId,
      failedAttempts,
      lockedUntil,
    });
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'pin_failed',
      tenantId: user.tenantId,
      locationId: user.locationId,
      actorUserId: user.userId,
      actorRole: ROLE_LABEL[user.role],
      targetId: user.userId,
      after: { purpose: 'kiosk_exit' },
      idempotencyKey: `pin_failed-kiosk-${kioskSessionId}-${failedAttempts}`,
    });
    if (lockedUntil) {
      throw AuthErrors.kioskPinLocked(lockedUntil.toISOString());
    }
    throw AuthErrors.invalidCredentials();
  }
  await runtime.auth.upsertKioskPinAttempt({
    kioskSessionId,
    userId: user.userId,
    failedAttempts: 0,
    lockedUntil: null,
  });
  const verification = await runtime.auth.createPinVerification({
    userId: user.userId,
    purpose: 'kiosk_exit',
    expiresAt: new Date(now.getTime() + PIN_VERIFY_TTL_MS),
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'pin_verified',
    tenantId: user.tenantId,
    locationId: user.locationId,
    actorUserId: user.userId,
    actorRole: ROLE_LABEL[user.role],
    targetId: user.userId,
    after: { purpose: 'kiosk_exit' },
    idempotencyKey: `pin_verified-${verification.verificationId}`,
  });
  return buildSuccess({
    verified: true,
    verification_id: verification.verificationId,
    purpose: 'kiosk_exit' as const,
    session_token: null,
  });
}
