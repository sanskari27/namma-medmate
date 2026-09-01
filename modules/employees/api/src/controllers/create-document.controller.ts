import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createDocument } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createCreateDocumentController(runtime: EmployeesRuntime) {
  return async function createDocumentController(input: AuthedRequest) {
    return buildSuccess(await createDocument(runtime, input));
  };
}
