import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createUser } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createCreateUserController(runtime: ManageUsersRuntime) {
  return async function createUserController(input: AuthedRequest) {
    return buildSuccess(await createUser(runtime, input));
  };
}
