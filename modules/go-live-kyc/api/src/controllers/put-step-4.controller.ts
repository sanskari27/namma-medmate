import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putStep4 } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createPutStep4Controller(runtime: GoLiveKycRuntime) {
  return async function putStep4Controller(input: AuthedRequest) {
    return buildSuccess(await putStep4(runtime, input));
  };
}
