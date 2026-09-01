import type {
  AuthRepository,
  EmployeesRepository,
  TenancyRepository,
} from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import type { StorageClient } from '@namma-medmate/storage-client';
import type { EmployeesAuditClient } from './audit/client.ts';
import type { PlanGatingClient } from './plan-gating/client.ts';

export interface EmployeesRuntime {
  employees: EmployeesRepository;
  auth: AuthRepository;
  tenancy: TenancyRepository;
  planGating: PlanGatingClient;
  audit: EmployeesAuditClient;
  storage: StorageClient;
  logger: Logger;
  piiKey: string;
  storageBucket: string;
  now: () => Date;
}
