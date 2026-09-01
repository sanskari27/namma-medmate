import type {
  AuthRepository,
  GoLiveKycRepository,
  TenancyRepository,
} from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import type { StorageClient } from '@namma-medmate/storage-client';
import type { AccountSettingsClient } from './account-settings/client.ts';
import type { GoLiveKycAuditClient } from './audit/client.ts';
import type { BooksGstClient } from './books/client.ts';
import type { InventoryClient } from './inventory/client.ts';
import type { ManageUsersClient } from './manage-users/client.ts';
import type { PlanGatingClient } from './plan-gating/client.ts';

export interface GoLiveKycRuntime {
  kyc: GoLiveKycRepository;
  auth: AuthRepository;
  tenancy: TenancyRepository;
  planGating: PlanGatingClient;
  audit: GoLiveKycAuditClient;
  storage: StorageClient;
  inventory: InventoryClient;
  books: BooksGstClient;
  accountSettings: AccountSettingsClient;
  manageUsers: ManageUsersClient;
  logger: Logger;
  piiKey: string;
  storageBucket: string;
  now: () => Date;
}
