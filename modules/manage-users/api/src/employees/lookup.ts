import type { EmployeesRepository } from '@namma-medmate/db-services';

export interface EmployeeRecord {
  employeeId: string;
  tenantId: string;
  locationId: string;
}

export interface EmployeesLookup {
  getById(employeeId: string): Promise<EmployeeRecord | undefined>;
}

export class MemoryEmployeesLookup implements EmployeesLookup {
  readonly employees = new Map<string, EmployeeRecord>();

  async getById(employeeId: string): Promise<EmployeeRecord | undefined> {
    return this.employees.get(employeeId);
  }
}

export function employeesLookupFromRepo(repo: EmployeesRepository): EmployeesLookup {
  return {
    async getById(employeeId: string): Promise<EmployeeRecord | undefined> {
      const row = await repo.getById(employeeId);
      if (!row) {
        return undefined;
      }
      return { employeeId: row.employeeId, tenantId: row.tenantId, locationId: row.locationId };
    },
  };
}
