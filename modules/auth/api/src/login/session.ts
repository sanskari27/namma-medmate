import { randomBytes, randomInt } from 'node:crypto';
import type { AuthRepository, UserRecord } from '@namma-medmate/db-services';
import {
  hashBearerToken,
  PHARMACY_SESSION_PREFIX,
  SESSION_IDLE_MS,
} from '@namma-medmate/auth-utils';
import { sha256 } from '@namma-medmate/encryption-utils';
import type { Logger } from '@namma-medmate/logger';
import { AuthErrors } from '../errors.ts';
import { ROLE_LABEL, toLoginPayload } from '../http/mappers.ts';
import { recordAudit } from '../audit/record.ts';
import type { AuthAuditClient } from '../audit/client.ts';
import type { WhatsAppSendClient } from '../whatsapp/client.ts';

export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;
export const KIOSK_LOCK_MS = 10 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_MS = 30 * 1000;
export const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const PIN_VERIFY_TTL_MS = 5 * 60 * 1000;
export const DEVICE_TOKEN_PREFIX = 'nm_dev_';

export interface AuthRuntime {
  auth: AuthRepository;
  whatsapp: WhatsAppSendClient;
  audit: AuthAuditClient;
  logger: Logger;
  now: () => Date;
  randomOtp: () => string;
  issueToken: (prefix: string) => string;
}

export function createRandomOtp(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0');
}

export function createOpaqueToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString('base64url')}`;
}

export function hashOtp(otp: string): string {
  return sha256(otp);
}

export async function requireUserByLogin(
  runtime: AuthRuntime,
  loginId: string,
): Promise<UserRecord> {
  const user = await runtime.auth.findUserByLoginId(loginId);
  if (!user) {
    throw AuthErrors.invalidCredentials();
  }
  return user;
}

export function assertActive(user: UserRecord): void {
  if (!user.active) {
    throw AuthErrors.userInactive();
  }
  if (!user.passwordEnabled && !user.otpEnabled) {
    throw AuthErrors.noLoginMethod();
  }
}

export function assertUnlocked(user: UserRecord, now: Date): void {
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    throw AuthErrors.accountLocked(user.lockedUntil.toISOString());
  }
}

export async function recordSharedFailure(
  runtime: AuthRuntime,
  user: UserRecord,
  action: string,
): Promise<never> {
  const now = runtime.now();
  const failedAttempts = user.failedAttempts + 1;
  const lockedUntil = failedAttempts >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;
  await runtime.auth.updateUserLock(user.userId, failedAttempts, lockedUntil);
  await recordAudit(runtime.audit, runtime.logger, {
    action,
    tenantId: user.tenantId,
    locationId: user.locationId,
    actorUserId: user.userId,
    actorRole: ROLE_LABEL[user.role],
    targetId: user.userId,
    after: { reason: action },
    idempotencyKey: `${action}-${user.userId}-${now.toISOString()}`,
  });
  if (lockedUntil) {
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'account_locked',
      tenantId: user.tenantId,
      locationId: user.locationId,
      actorUserId: user.userId,
      actorRole: ROLE_LABEL[user.role],
      targetId: user.userId,
      after: { locked_until: lockedUntil.toISOString() },
      idempotencyKey: `account_locked-${user.userId}-${lockedUntil.toISOString()}`,
    });
    throw AuthErrors.accountLocked(lockedUntil.toISOString());
  }
  if (action === 'login_failed') {
    throw AuthErrors.invalidCredentials();
  }
  if (action === 'pin_failed') {
    throw AuthErrors.invalidCredentials();
  }
  throw AuthErrors.invalidOtp();
}

export async function issueLoginSession(
  runtime: AuthRuntime,
  user: UserRecord,
  rememberDevice: boolean,
  userAgent?: string,
) {
  const now = runtime.now();
  await runtime.auth.resetUserLock(user.userId);
  const sessionToken = runtime.issueToken(PHARMACY_SESSION_PREFIX);
  const session = await runtime.auth.createSession({
    userId: user.userId,
    tenantId: user.tenantId,
    locationId: user.locationId,
    tokenHash: hashBearerToken(sessionToken),
  });
  let deviceToken: string | null = null;
  if (rememberDevice && user.pinHash) {
    deviceToken = runtime.issueToken(DEVICE_TOKEN_PREFIX);
    await runtime.auth.createSavedDevice({
      userId: user.userId,
      tenantId: user.tenantId,
      locationId: user.locationId,
      tokenHash: hashBearerToken(deviceToken),
      expiresAt: new Date(now.getTime() + DEVICE_TTL_MS),
      userAgent: userAgent ?? null,
    });
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'device_remembered',
      tenantId: user.tenantId,
      locationId: user.locationId,
      actorUserId: user.userId,
      actorRole: ROLE_LABEL[user.role],
      targetId: user.userId,
      after: { session_id: session.sessionId },
      idempotencyKey: `device_remembered-${session.sessionId}`,
    });
  }
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'login_succeeded',
    tenantId: user.tenantId,
    locationId: user.locationId,
    actorUserId: user.userId,
    actorRole: ROLE_LABEL[user.role],
    targetId: user.userId,
    after: { session_id: session.sessionId },
    idempotencyKey: `login_succeeded-${session.sessionId}`,
  });
  return toLoginPayload(user, {
    sessionId: session.sessionId,
    sessionToken,
    deviceToken,
  });
}

export async function requirePharmacySession(
  runtime: AuthRuntime,
  authorization: string | undefined,
) {
  if (!authorization?.startsWith('Bearer ')) {
    throw AuthErrors.unauthenticated();
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token.startsWith(PHARMACY_SESSION_PREFIX) || token.includes(' ')) {
    throw AuthErrors.unauthenticated();
  }
  const session = await runtime.auth.findSessionByTokenHash(hashBearerToken(token));
  const now = runtime.now();
  if (
    !session ||
    session.revokedAt ||
    now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS
  ) {
    throw AuthErrors.unauthenticated();
  }
  const user = await runtime.auth.findUserById(session.userId);
  if (!user) {
    throw AuthErrors.unauthenticated();
  }
  return { session, user, token };
}

export function readBody(req: { body?: unknown }): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

export function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw AuthErrors.validationFailed(`${key} is required`);
  }
  return value.trim();
}

export function readOptionalBoolean(body: Record<string, unknown>, key: string): boolean {
  const value = body[key];
  return value === true;
}

export function clientIp(req: { ip?: string; headers: { [key: string]: unknown } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.ip ?? '0.0.0.0';
}

export function userAgentOf(req: { headers: { [key: string]: unknown } }): string | undefined {
  const value = req.headers['user-agent'];
  return typeof value === 'string' ? value : undefined;
}
