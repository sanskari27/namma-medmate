import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getEmployee } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createGetEmployeeController(runtime: EmployeesRuntime) {
  return async function getEmployeeController(input: AuthedRequest) {
    return buildSuccess(await getEmployee(runtime, input));
  };
}
