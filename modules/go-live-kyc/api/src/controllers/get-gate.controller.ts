import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getGate } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createGetGateController(runtime: GoLiveKycRuntime) {
  return async function getGateController(input: AuthedRequest) {
    return buildSuccess(await getGate(runtime, input));
  };
}
