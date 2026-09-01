import { verifySecret } from '@namma-medmate/encryption-utils';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Request } from 'express';
import { AuthErrors } from '../errors.ts';
import { assertLoginRateLimit } from '../login/rate-limit.ts';
import {
  assertActive,
  assertUnlocked,
  clientIp,
  issueLoginSession,
  readBody,
  readOptionalBoolean,
  readString,
  recordSharedFailure,
  requireUserByLogin,
  userAgentOf,
  type AuthRuntime,
} from '../login/session.ts';

export function createLoginPasswordController(runtime: AuthRuntime) {
  return async function loginWithPassword(_input: unknown, req: Request) {
    const body = readBody(req);
    const loginId = readString(body, 'login_id');
    const password = readString(body, 'password');
    const rememberDevice = readOptionalBoolean(body, 'remember_device');
    assertLoginRateLimit(loginId, clientIp(req));
    const user = await requireUserByLogin(runtime, loginId);
    assertActive(user);
    assertUnlocked(user, runtime.now());
    if (!user.passwordEnabled) {
      throw AuthErrors.methodDisabled();
    }
    if (!user.passwordHash || !(await verifySecret(user.passwordHash, password))) {
      return recordSharedFailure(runtime, user, 'login_failed');
    }
    await runtime.auth.consumeTempPassword(user.userId);
    return buildSuccess(await issueLoginSession(runtime, user, rememberDevice, userAgentOf(req)));
  };
}
