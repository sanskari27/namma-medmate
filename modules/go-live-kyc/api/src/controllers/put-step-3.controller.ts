import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putStep3 } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createPutStep3Controller(runtime: GoLiveKycRuntime) {
  return async function putStep3Controller(input: AuthedRequest) {
    return buildSuccess(await putStep3(runtime, input));
  };
}
