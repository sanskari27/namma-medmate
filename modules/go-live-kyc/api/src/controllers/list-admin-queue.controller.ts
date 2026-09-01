import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { listAdminQueue } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createListAdminQueueController(runtime: GoLiveKycRuntime) {
  return async function listAdminQueueController(input: AuthedRequest) {
    return buildSuccess(await listAdminQueue(runtime, input));
  };
}
