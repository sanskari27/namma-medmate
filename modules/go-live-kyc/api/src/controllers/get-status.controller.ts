import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getStatus } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createGetStatusController(runtime: GoLiveKycRuntime) {
  return async function getStatusController(input: AuthedRequest) {
    return buildSuccess(await getStatus(runtime, input));
  };
}
