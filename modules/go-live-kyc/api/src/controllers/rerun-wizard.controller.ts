import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { rerunWizard } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createRerunWizardController(runtime: GoLiveKycRuntime) {
  return async function rerunWizardController(input: AuthedRequest) {
    return buildSuccess(await rerunWizard(runtime, input));
  };
}
