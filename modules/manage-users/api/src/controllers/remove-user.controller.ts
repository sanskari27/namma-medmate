import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { removeUser } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createRemoveUserController(runtime: ManageUsersRuntime) {
  return async function removeUserController(input: AuthedRequest) {
    return buildSuccess(await removeUser(runtime, input));
  };
}
