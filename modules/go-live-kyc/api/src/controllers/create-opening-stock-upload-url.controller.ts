import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createOpeningStockUploadUrl } from '../ops.ts';
import type { GoLiveKycRuntime } from '../runtime.ts';

export function createOpeningStockUploadUrlController(runtime: GoLiveKycRuntime) {
  return async function openingStockUploadUrlController(input: AuthedRequest) {
    return buildSuccess(await createOpeningStockUploadUrl(runtime, input));
  };
}
