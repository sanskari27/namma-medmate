import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { assertLoginRateLimit } from '../login/rate-limit.ts';
import {
  OTP_TTL_MS,
  RESEND_MS,
  assertActive,
  assertUnlocked,
  clientIp,
  hashOtp,
  readBody,
  readString,
  requireUserByLogin,
  type AuthRuntime,
} from '../login/session.ts';
import { recordAudit } from '../audit/record.ts';
import { ROLE_LABEL } from '../http/mappers.ts';

export function createRequestOtpController(runtime: AuthRuntime) {
  return async function requestLoginOtp(_input: unknown, req: Request) {
    const loginId = readString(readBody(req), 'login_id');
    assertLoginRateLimit(loginId, clientIp(req));
    const user = await requireUserByLogin(runtime, loginId);
    assertActive(user);
    assertUnlocked(user, runtime.now());
    if (!user.otpEnabled) {
      throw AuthErrors.methodDisabled();
    }
    if (!user.otpMobile) {
      throw AuthErrors.methodDisabled();
    }
    const now = runtime.now();
    if (user.otpResendAvailableAt && user.otpResendAvailableAt.getTime() > now.getTime()) {
      throw AuthErrors.resendCooldown(user.otpResendAvailableAt.toISOString());
    }
    const otp = runtime.randomOtp();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
    const resendAvailableAt = new Date(now.getTime() + RESEND_MS);
    const challenge = await runtime.auth.createOtpChallenge({
      userId: user.userId,
      otpHash: hashOtp(otp),
      expiresAt,
    });
    await runtime.auth.updateOtpResendAvailableAt(user.userId, resendAvailableAt);
    const sent = await runtime.whatsapp.sendLoginOtp({
      tenantId: user.tenantId,
      locationId: user.locationId,
      to: user.otpMobile,
      challengeId: challenge.challengeId,
      otp,
    });
    if (!sent.delivered) {
      await recordAudit(runtime.audit, runtime.logger, {
        action: 'login_failed',
        tenantId: user.tenantId,
        locationId: user.locationId,
        actorUserId: user.userId,
        actorRole: ROLE_LABEL[user.role],
        targetId: user.userId,
        after: { reason: 'undeliverable' },
        idempotencyKey: `otp-undeliverable-${challenge.challengeId}`,
      });
      throw AuthErrors.undeliverable();
    }
    return buildSuccess({
      challenge_id: challenge.challengeId,
      expires_at: expiresAt.toISOString(),
      resend_available_at: resendAvailableAt.toISOString(),
      otp_length: 4 as const,
    });
  };
}
