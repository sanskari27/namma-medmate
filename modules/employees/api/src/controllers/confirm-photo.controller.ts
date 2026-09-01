import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { confirmPhoto } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createConfirmPhotoController(runtime: EmployeesRuntime) {
  return async function confirmPhotoController(input: AuthedRequest) {
    return buildSuccess(await confirmPhoto(runtime, input));
  };
}
