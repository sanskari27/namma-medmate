import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { patchEmployee } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createPatchEmployeeController(runtime: EmployeesRuntime) {
  return async function patchEmployeeController(input: AuthedRequest) {
    return buildSuccess(await patchEmployee(runtime, input));
  };
}
