import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { listPharmacistEligible } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createListPharmacistEligibleController(runtime: EmployeesRuntime) {
  return async function listPharmacistEligibleController(input: AuthedRequest) {
    return buildSuccess(await listPharmacistEligible(runtime, input));
  };
}
