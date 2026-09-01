import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { listEmployees } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createListEmployeesController(runtime: EmployeesRuntime) {
  return async function listEmployeesController(input: AuthedRequest) {
    return buildSuccess(await listEmployees(runtime, input));
  };
}
