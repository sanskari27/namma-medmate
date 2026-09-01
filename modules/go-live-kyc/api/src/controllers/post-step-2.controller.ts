import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { postStep2 } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createPostStep2Controller(runtime: GoLiveKycRuntime) {
  return async function postStep2Controller(input: AuthedRequest) {
    return buildSuccess(await postStep2(runtime, input));
  };
}
