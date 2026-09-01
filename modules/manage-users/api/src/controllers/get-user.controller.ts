import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getUser } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createGetUserController(runtime: ManageUsersRuntime) {
  return async function getUserController(input: AuthedRequest) {
    return buildSuccess(await getUser(runtime, input));
  };
}
