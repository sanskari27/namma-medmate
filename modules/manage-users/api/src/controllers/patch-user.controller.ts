import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { patchUser } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createPatchUserController(runtime: ManageUsersRuntime) {
  return async function patchUserController(input: AuthedRequest) {
    return buildSuccess(await patchUser(runtime, input));
  };
}
