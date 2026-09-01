import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { deletePin } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createDeletePinController(runtime: ManageUsersRuntime) {
  return async function deletePinController(input: AuthedRequest) {
    return buildSuccess(await deletePin(runtime, input));
  };
}
