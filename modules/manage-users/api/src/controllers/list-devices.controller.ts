import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { listDevices } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createListDevicesController(runtime: ManageUsersRuntime) {
  return async function listDevicesController(input: AuthedRequest) {
    return buildSuccess(await listDevices(runtime, input));
  };
}
