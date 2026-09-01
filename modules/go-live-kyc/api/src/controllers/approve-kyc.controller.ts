import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { approveKyc } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createApproveKycController(runtime: GoLiveKycRuntime) {
  return async function approveKycController(input: AuthedRequest) {
    return buildSuccess(await approveKyc(runtime, input));
  };
}
