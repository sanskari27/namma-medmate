import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { copyPassword } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createCopyPasswordController(runtime: ManageUsersRuntime) {
  return async function copyPasswordController(input: AuthedRequest) {
    return buildSuccess(await copyPassword(runtime, input));
  };
}
