import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { assertLoginRateLimit } from '../login/rate-limit.ts';
import {
  assertActive,
  assertUnlocked,
  clientIp,
  hashOtp,
  issueLoginSession,
  readBody,
  readOptionalBoolean,
  readString,
  recordSharedFailure,
  requireUserByLogin,
  userAgentOf,
  type AuthRuntime,
} from '../login/session.ts';

export function createVerifyOtpController(runtime: AuthRuntime) {
  return async function verifyLoginOtp(_input: unknown, req: Request) {
    const body = readBody(req);
    const loginId = readString(body, 'login_id');
    const challengeId = readString(body, 'challenge_id');
    const otp = readString(body, 'otp');
    const rememberDevice = readOptionalBoolean(body, 'remember_device');
    assertLoginRateLimit(loginId, clientIp(req));
    const user = await requireUserByLogin(runtime, loginId);
    assertActive(user);
    assertUnlocked(user, runtime.now());
    if (!user.otpEnabled) {
      throw AuthErrors.methodDisabled();
    }
    const challenge = await runtime.auth.findOtpChallenge(challengeId);
    if (!challenge || challenge.userId !== user.userId) {
      throw AuthErrors.invalidOtp();
    }
    if (challenge.consumedAt) {
      throw AuthErrors.otpConsumed();
    }
    if (challenge.expiresAt.getTime() <= runtime.now().getTime()) {
      throw AuthErrors.otpExpired();
    }
    if (challenge.otpHash !== hashOtp(otp)) {
      await runtime.auth.incrementOtpAttempts(challengeId);
      return recordSharedFailure(runtime, user, 'login_failed');
    }
    const consumed = await runtime.auth.consumeOtpChallenge(challengeId, runtime.now());
    if (!consumed) {
      throw AuthErrors.otpConsumed();
    }
    return buildSuccess(await issueLoginSession(runtime, user, rememberDevice, userAgentOf(req)));
  };
}
