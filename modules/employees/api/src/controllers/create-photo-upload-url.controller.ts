import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createPhotoUploadUrl } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createPhotoUploadUrlController(runtime: EmployeesRuntime) {
  return async function photoUploadUrlController(input: AuthedRequest) {
    return buildSuccess(await createPhotoUploadUrl(runtime, input));
  };
}
