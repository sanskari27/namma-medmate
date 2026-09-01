import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putPin } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createPutPinController(runtime: ManageUsersRuntime) {
  return async function putPinController(input: AuthedRequest) {
    return buildSuccess(await putPin(runtime, input));
  };
}
