import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { getSummary } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createGetSummaryController(runtime: EmployeesRuntime) {
  return async function getSummaryController(input: AuthedRequest) {
    return buildSuccess(await getSummary(runtime, input));
  };
}
