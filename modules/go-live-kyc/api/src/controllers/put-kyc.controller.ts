import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putKyc } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createPutKycController(runtime: GoLiveKycRuntime) {
  return async function putKycController(input: AuthedRequest) {
    return buildSuccess(await putKyc(runtime, input));
  };
}
