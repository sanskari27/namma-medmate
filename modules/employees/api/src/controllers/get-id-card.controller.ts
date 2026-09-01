import type { AuthedRequest } from '../http/parse-auth.ts';
import { getIdCard } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createGetIdCardController(runtime: EmployeesRuntime) {
  return async function getIdCardController(input: AuthedRequest) {
    return getIdCard(runtime, input);
  };
}
