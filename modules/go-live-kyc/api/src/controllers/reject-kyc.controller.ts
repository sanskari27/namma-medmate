import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { rejectKyc } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createRejectKycController(runtime: GoLiveKycRuntime) {
  return async function rejectKycController(input: AuthedRequest) {
    return buildSuccess(await rejectKyc(runtime, input));
  };
}
