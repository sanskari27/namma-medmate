import type { AuthedRequest } from '../http/parse-auth.ts';
import { deleteEmployee } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createDeleteEmployeeController(_runtime: EmployeesRuntime) {
  return async function deleteEmployeeController(_input: AuthedRequest) {
    return deleteEmployee();
  };
}
