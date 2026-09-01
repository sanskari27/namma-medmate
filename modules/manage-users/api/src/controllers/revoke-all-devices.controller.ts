import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { revokeAllDevices } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createRevokeAllDevicesController(runtime: ManageUsersRuntime) {
  return async function revokeAllDevicesController(input: AuthedRequest) {
    return buildSuccess(await revokeAllDevices(runtime, input));
  };
}
