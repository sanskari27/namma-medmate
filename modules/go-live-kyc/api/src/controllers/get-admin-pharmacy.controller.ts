import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getAdminPharmacy } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createGetAdminPharmacyController(runtime: GoLiveKycRuntime) {
  return async function getAdminPharmacyController(input: AuthedRequest) {
    return buildSuccess(await getAdminPharmacy(runtime, input));
  };
}
