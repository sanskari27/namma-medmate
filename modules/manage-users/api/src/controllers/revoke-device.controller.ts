import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { revokeDevice } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createRevokeDeviceController(runtime: ManageUsersRuntime) {
  return async function revokeDeviceController(input: AuthedRequest) {
    return buildSuccess(await revokeDevice(runtime, input));
  };
}
