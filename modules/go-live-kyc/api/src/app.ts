import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import {
  createMemoryAuthRepository,
  createMemoryGoLiveKycRepository,
  createMemoryTenancyRepository,
  type AuthRepository,
  type GoLiveKycRepository,
  type TenancyRepository,
} from '@namma-medmate/db-services';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import type { Logger } from '@namma-medmate/logger';
import { MemoryStorageClient, type StorageClient } from '@namma-medmate/storage-client';
import {
  MemoryAccountSettingsClient,
  createHttpAccountSettingsClient,
  type AccountSettingsClient,
} from './account-settings/client.ts';
import { MemoryAuditClient, type GoLiveKycAuditClient } from './audit/client.ts';
import { createHttpAuditClient } from './audit/http-client.ts';
import {
  MemoryBooksGstClient,
  createHttpBooksGstClient,
  type BooksGstClient,
} from './books/client.ts';
import { loadGoLiveKycEnv, type GoLiveKycEnv } from './config/env.ts';
import { createApproveKycController } from './controllers/approve-kyc.controller.ts';
import { createCompleteWizardController } from './controllers/complete-wizard.controller.ts';
import { createOpeningStockUploadUrlController } from './controllers/create-opening-stock-upload-url.controller.ts';
import { createGetAdminPharmacyController } from './controllers/get-admin-pharmacy.controller.ts';
import { createGetGateController } from './controllers/get-gate.controller.ts';
import { createGetStatusController } from './controllers/get-status.controller.ts';
import { createGetWizardController } from './controllers/get-wizard.controller.ts';
import { createListAdminQueueController } from './controllers/list-admin-queue.controller.ts';
import { createPostStep2Controller } from './controllers/post-step-2.controller.ts';
import { createPutKycController } from './controllers/put-kyc.controller.ts';
import { createPutStep1Controller } from './controllers/put-step-1.controller.ts';
import { createPutStep3Controller } from './controllers/put-step-3.controller.ts';
import { createPutStep4Controller } from './controllers/put-step-4.controller.ts';
import { createPutStep5Controller } from './controllers/put-step-5.controller.ts';
import { createRejectKycController } from './controllers/reject-kyc.controller.ts';
import { createRerunWizardController } from './controllers/rerun-wizard.controller.ts';
import { createAuthParser } from './http/parse-auth.ts';
import {
  MemoryInventoryClient,
  createHttpInventoryClient,
  type InventoryClient,
} from './inventory/client.ts';
import { localSeedPharmacy } from './local-seed.ts';
import {
  MemoryManageUsersClient,
  createHttpManageUsersClient,
  type ManageUsersClient,
} from './manage-users/client.ts';
import { MemoryPlanGatingClient, type PlanGatingClient } from './plan-gating/client.ts';
import { createHttpPlanGatingClient } from './plan-gating/http-client.ts';
import { GO_LIVE_KYC_SERVICE_NAME, type GoLiveKycRuntime } from './runtime.ts';

export const getGateEndpoint = {
  method: 'get' as const,
  path: '/go-live-kyc/gate',
  operationId: 'getGoLiveKycGate',
};
export const getStatusEndpoint = {
  method: 'get' as const,
  path: '/go-live-kyc/status',
  operationId: 'getGoLiveKycStatus',
};
export const putKycEndpoint = {
  method: 'put' as const,
  path: '/go-live-kyc/kyc',
  operationId: 'putGoLiveKyc',
};
export const getWizardEndpoint = {
  method: 'get' as const,
  path: '/go-live-kyc/wizard',
  operationId: 'getGoLiveKycWizard',
};
export const putStep1Endpoint = {
  method: 'put' as const,
  path: '/go-live-kyc/wizard/steps/1',
  operationId: 'putGoLiveKycWizardStep1',
};
export const openingStockUploadUrlEndpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/wizard/steps/2/upload-url',
  operationId: 'createGoLiveKycOpeningStockUploadUrl',
};
export const postStep2Endpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/wizard/steps/2',
  operationId: 'postGoLiveKycWizardStep2',
};
export const putStep3Endpoint = {
  method: 'put' as const,
  path: '/go-live-kyc/wizard/steps/3',
  operationId: 'putGoLiveKycWizardStep3',
};
export const putStep4Endpoint = {
  method: 'put' as const,
  path: '/go-live-kyc/wizard/steps/4',
  operationId: 'putGoLiveKycWizardStep4',
};
export const putStep5Endpoint = {
  method: 'put' as const,
  path: '/go-live-kyc/wizard/steps/5',
  operationId: 'putGoLiveKycWizardStep5',
};
export const completeWizardEndpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/wizard/complete',
  operationId: 'completeGoLiveKycWizard',
};
export const rerunWizardEndpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/wizard/rerun',
  operationId: 'rerunGoLiveKycWizard',
};
export const listAdminQueueEndpoint = {
  method: 'get' as const,
  path: '/go-live-kyc/admin/queue',
  operationId: 'listGoLiveKycAdminQueue',
};
export const getAdminPharmacyEndpoint = {
  method: 'get' as const,
  path: '/go-live-kyc/admin/pharmacies/:tenant_id',
  operationId: 'getGoLiveKycAdminPharmacy',
};
export const approveKycEndpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/admin/pharmacies/:tenant_id/kyc/approve',
  operationId: 'approveGoLiveKyc',
};
export const rejectKycEndpoint = {
  method: 'post' as const,
  path: '/go-live-kyc/admin/pharmacies/:tenant_id/kyc/reject',
  operationId: 'rejectGoLiveKyc',
};

export function resolveApiSpecPath(
  exists: (path: string) => boolean = existsSync,
  metaUrl: string | undefined = import.meta.url,
  cwd = process.cwd(),
): string | undefined {
  const candidates: string[] = [];
  if (metaUrl) {
    try {
      candidates.push(join(dirname(fileURLToPath(metaUrl)), '../contract/swagger.yaml'));
    } catch {
      // Bundled CJS has an empty import.meta.url
    }
  }
  candidates.push(join(cwd, 'contract/swagger.yaml'), join(cwd, 'swagger.yaml'));
  return candidates.find((path) => exists(path));
}

function identity<T>(input: T): T {
  return input;
}

export interface GoLiveKycDeps {
  kyc?: GoLiveKycRepository;
  auth?: AuthRepository;
  tenancy?: TenancyRepository;
  planGating?: PlanGatingClient;
  audit?: GoLiveKycAuditClient;
  storage?: StorageClient;
  inventory?: InventoryClient;
  books?: BooksGstClient;
  accountSettings?: AccountSettingsClient;
  manageUsers?: ManageUsersClient;
  logger?: Logger;
  lookupPharmacySession?: PharmacySessionLookup;
  now?: () => Date;
  piiKey?: string;
}

export function createApp(env: GoLiveKycEnv = loadGoLiveKycEnv(), deps: GoLiveKycDeps = {}) {
  const boot = createExpressApp({
    serviceName: GO_LIVE_KYC_SERVICE_NAME,
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const runtime: GoLiveKycRuntime = {
    kyc: deps.kyc ?? createMemoryGoLiveKycRepository(),
    auth: deps.auth ?? createMemoryAuthRepository(),
    tenancy: deps.tenancy ?? createMemoryTenancyRepository(localSeedPharmacy()),
    planGating:
      deps.planGating ??
      (env.PLAN_GATING_API_BASE_URL
        ? createHttpPlanGatingClient(env.PLAN_GATING_API_BASE_URL)
        : new MemoryPlanGatingClient()),
    audit:
      deps.audit ??
      (env.AUDIT_API_BASE_URL && env.AUDIT_SERVICE_TOKEN
        ? createHttpAuditClient(env.AUDIT_API_BASE_URL, env.AUDIT_SERVICE_TOKEN)
        : new MemoryAuditClient()),
    storage: deps.storage ?? new MemoryStorageClient(),
    inventory:
      deps.inventory ??
      (env.INVENTORY_API_BASE_URL
        ? createHttpInventoryClient(env.INVENTORY_API_BASE_URL)
        : new MemoryInventoryClient()),
    books:
      deps.books ??
      (env.BOOKS_GST_API_BASE_URL
        ? createHttpBooksGstClient(env.BOOKS_GST_API_BASE_URL)
        : new MemoryBooksGstClient()),
    accountSettings:
      deps.accountSettings ??
      (env.ACCOUNT_SETTINGS_API_BASE_URL
        ? createHttpAccountSettingsClient(env.ACCOUNT_SETTINGS_API_BASE_URL)
        : new MemoryAccountSettingsClient()),
    manageUsers:
      deps.manageUsers ??
      (env.MANAGE_USERS_API_BASE_URL
        ? createHttpManageUsersClient(env.MANAGE_USERS_API_BASE_URL)
        : new MemoryManageUsersClient()),
    logger: deps.logger ?? boot.logger,
    piiKey: deps.piiKey ?? env.GO_LIVE_KYC_PII_KEY,
    storageBucket: env.GO_LIVE_KYC_STORAGE_BUCKET,
    now: deps.now ?? (() => new Date()),
  };
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(getGateEndpoint, parseAuth, identity, createGetGateController(runtime));
  boot.attachRoute(getStatusEndpoint, parseAuth, identity, createGetStatusController(runtime));
  boot.attachRoute(putKycEndpoint, parseAuth, identity, createPutKycController(runtime));
  boot.attachRoute(getWizardEndpoint, parseAuth, identity, createGetWizardController(runtime));
  boot.attachRoute(putStep1Endpoint, parseAuth, identity, createPutStep1Controller(runtime));
  boot.attachRoute(
    openingStockUploadUrlEndpoint,
    parseAuth,
    identity,
    createOpeningStockUploadUrlController(runtime),
  );
  boot.attachRoute(postStep2Endpoint, parseAuth, identity, createPostStep2Controller(runtime));
  boot.attachRoute(putStep3Endpoint, parseAuth, identity, createPutStep3Controller(runtime));
  boot.attachRoute(putStep4Endpoint, parseAuth, identity, createPutStep4Controller(runtime));
  boot.attachRoute(putStep5Endpoint, parseAuth, identity, createPutStep5Controller(runtime));
  boot.attachRoute(
    completeWizardEndpoint,
    parseAuth,
    identity,
    createCompleteWizardController(runtime),
  );
  boot.attachRoute(rerunWizardEndpoint, parseAuth, identity, createRerunWizardController(runtime));
  boot.attachRoute(
    listAdminQueueEndpoint,
    parseAuth,
    identity,
    createListAdminQueueController(runtime),
  );
  boot.attachRoute(
    getAdminPharmacyEndpoint,
    parseAuth,
    identity,
    createGetAdminPharmacyController(runtime),
  );
  boot.attachRoute(approveKycEndpoint, parseAuth, identity, createApproveKycController(runtime));
  boot.attachRoute(rejectKycEndpoint, parseAuth, identity, createRejectKycController(runtime));

  return boot.complete();
}
