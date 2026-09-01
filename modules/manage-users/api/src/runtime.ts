import type { AuthRepository, TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import type { ManageUsersAuditClient } from './audit/client.ts';
import type { EmployeesLookup } from './employees/lookup.ts';
import type { PlanGatingClient } from './plan-gating/client.ts';

export interface ManageUsersRuntime {
  auth: AuthRepository;
  tenancy: TenancyRepository;
  planGating: PlanGatingClient;
  employees: EmployeesLookup;
  audit: ManageUsersAuditClient;
  logger: Logger;
  tempPasswordKey: string;
  now: () => Date;
  randomPassword?: () => string;
}

export function logSeatsChanged(
  logger: Logger,
  payload: {
    tenant_id: string;
    location_id: string;
    active_count: number;
    seat_limit: number | null;
  },
): void {
  logger.info('manage-users.seats.changed', payload);
}
