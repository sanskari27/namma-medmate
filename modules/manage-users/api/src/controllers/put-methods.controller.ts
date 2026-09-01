import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putMethods } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createPutMethodsController(runtime: ManageUsersRuntime) {
  return async function putMethodsController(input: AuthedRequest) {
    return buildSuccess(await putMethods(runtime, input));
  };
}
