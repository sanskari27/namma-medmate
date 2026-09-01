import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { deleteDocument } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createDeleteDocumentController(runtime: EmployeesRuntime) {
  return async function deleteDocumentController(input: AuthedRequest) {
    return buildSuccess(await deleteDocument(runtime, input));
  };
}
