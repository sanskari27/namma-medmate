import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { completeWizard } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createCompleteWizardController(runtime: GoLiveKycRuntime) {
  return async function completeWizardController(input: AuthedRequest) {
    return buildSuccess(await completeWizard(runtime, input));
  };
}
