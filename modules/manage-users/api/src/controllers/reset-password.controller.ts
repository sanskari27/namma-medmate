import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { resetPassword } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createResetPasswordController(runtime: ManageUsersRuntime) {
  return async function resetPasswordController(input: AuthedRequest) {
    return buildSuccess(await resetPassword(runtime, input));
  };
}
