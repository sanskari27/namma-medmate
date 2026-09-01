import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { putStep1 } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createPutStep1Controller(runtime: GoLiveKycRuntime) {
  return async function putStep1Controller(input: AuthedRequest) {
    return buildSuccess(await putStep1(runtime, input));
  };
}
