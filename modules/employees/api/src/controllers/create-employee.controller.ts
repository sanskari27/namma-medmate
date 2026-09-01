import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { createEmployee } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createCreateEmployeeController(runtime: EmployeesRuntime) {
  return async function createEmployeeController(input: AuthedRequest) {
    return buildSuccess(await createEmployee(runtime, input));
  };
}
