import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { listUsers } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createListUsersController(runtime: ManageUsersRuntime) {
  return async function listUsersController(input: AuthedRequest) {
    return buildSuccess(await listUsers(runtime, input));
  };
}
