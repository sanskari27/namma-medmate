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
