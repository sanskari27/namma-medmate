import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getWizard } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createGetWizardController(runtime: GoLiveKycRuntime) {
  return async function getWizardController(input: AuthedRequest) {
    return buildSuccess(await getWizard(runtime, input));
  };
}
