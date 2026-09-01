import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createDocumentUploadUrl } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createDocumentUploadUrlController(runtime: EmployeesRuntime) {
  return async function documentUploadUrlController(input: AuthedRequest) {
    return buildSuccess(await createDocumentUploadUrl(runtime, input));
  };
}
