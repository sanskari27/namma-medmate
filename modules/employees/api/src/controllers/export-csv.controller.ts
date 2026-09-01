import type { AuthedRequest } from '../http/parse-auth.ts';
import { exportCsv } from '../ops.ts';
import type { EmployeesRuntime } from '../runtime.ts';

export function createExportCsvController(runtime: EmployeesRuntime) {
  return async function exportCsvController(input: AuthedRequest) {
    return exportCsv(runtime, input);
  };
}
