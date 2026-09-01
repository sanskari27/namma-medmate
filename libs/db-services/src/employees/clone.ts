import type { EmployeeDocumentRecord, EmployeeRecord } from './types.ts';

export function cloneEmployee(row: EmployeeRecord): EmployeeRecord {
  return { ...row };
}

export function cloneDocument(row: EmployeeDocumentRecord): EmployeeDocumentRecord {
  return { ...row };
}
