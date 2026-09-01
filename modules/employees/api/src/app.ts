import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import {
  createMemoryAuthRepository,
  createMemoryEmployeesRepository,
  createMemoryTenancyRepository,
  type AuthRepository,
  type EmployeesRepository,
  type TenancyRepository,
} from '@namma-medmate/db-services';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import type { Logger } from '@namma-medmate/logger';
import { MemoryStorageClient, type StorageClient } from '@namma-medmate/storage-client';
import { MemoryAuditClient, type EmployeesAuditClient } from './audit/client.ts';
import { createHttpAuditClient } from './audit/http-client.ts';
import { loadEmployeesEnv, type EmployeesEnv } from './config/env.ts';
import { createConfirmPhotoController } from './controllers/confirm-photo.controller.ts';
import { createCreateDocumentController } from './controllers/create-document.controller.ts';
import { createDocumentUploadUrlController } from './controllers/create-document-upload-url.controller.ts';
import { createCreateEmployeeController } from './controllers/create-employee.controller.ts';
import { createPhotoUploadUrlController } from './controllers/create-photo-upload-url.controller.ts';
import { createDeleteDocumentController } from './controllers/delete-document.controller.ts';
import { createDeleteEmployeeController } from './controllers/delete-employee.controller.ts';
import { createExportCsvController } from './controllers/export-csv.controller.ts';
import { createGetEmployeeController } from './controllers/get-employee.controller.ts';
import { createGetIdCardController } from './controllers/get-id-card.controller.ts';
import { createGetSummaryController } from './controllers/get-summary.controller.ts';
import { createListEmployeesController } from './controllers/list-employees.controller.ts';
import { createListPharmacistEligibleController } from './controllers/list-pharmacist-eligible.controller.ts';
import { createPatchEmployeeController } from './controllers/patch-employee.controller.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { localSeedPharmacy } from './local-seed.ts';
import { MemoryPlanGatingClient, type PlanGatingClient } from './plan-gating/client.ts';
import { createHttpPlanGatingClient } from './plan-gating/http-client.ts';
import type { EmployeesRuntime } from './runtime.ts';

export const getSummaryEndpoint = {
  method: 'get' as const,
  path: '/employees/summary',
  operationId: 'getEmployeesSummary',
};
export const listEmployeesEndpoint = {
  method: 'get' as const,
  path: '/employees',
  operationId: 'listEmployees',
};
export const createEmployeeEndpoint = {
  method: 'post' as const,
  path: '/employees',
  operationId: 'createEmployee',
  successStatus: 201,
};
export const listPharmacistEligibleEndpoint = {
  method: 'get' as const,
  path: '/employees/pharmacist-eligible',
  operationId: 'listPharmacistEligible',
};
export const exportCsvEndpoint = {
  method: 'get' as const,
  path: '/employees/export.csv',
  operationId: 'exportEmployeesCsv',
  responseType: 'raw' as const,
};
export const getEmployeeEndpoint = {
  method: 'get' as const,
  path: '/employees/:employee_id',
  operationId: 'getEmployee',
};
export const patchEmployeeEndpoint = {
  method: 'patch' as const,
  path: '/employees/:employee_id',
  operationId: 'patchEmployee',
};
export const deleteEmployeeEndpoint = {
  method: 'delete' as const,
  path: '/employees/:employee_id',
  operationId: 'deleteEmployee',
};
export const photoUploadUrlEndpoint = {
  method: 'post' as const,
  path: '/employees/:employee_id/photo/upload-url',
  operationId: 'createEmployeePhotoUploadUrl',
};
export const confirmPhotoEndpoint = {
  method: 'put' as const,
  path: '/employees/:employee_id/photo',
  operationId: 'confirmEmployeePhoto',
};
export const documentUploadUrlEndpoint = {
  method: 'post' as const,
  path: '/employees/:employee_id/documents/upload-url',
  operationId: 'createEmployeeDocumentUploadUrl',
};
export const createDocumentEndpoint = {
  method: 'post' as const,
  path: '/employees/:employee_id/documents',
  operationId: 'createEmployeeDocument',
  successStatus: 201,
};
export const deleteDocumentEndpoint = {
  method: 'delete' as const,
  path: '/employees/:employee_id/documents/:document_id',
  operationId: 'deleteEmployeeDocument',
};
export const idCardEndpoint = {
  method: 'get' as const,
  path: '/employees/:employee_id/id-card.pdf',
  operationId: 'getEmployeeIdCardPdf',
  responseType: 'raw' as const,
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

export interface EmployeesDeps {
  employees?: EmployeesRepository;
  auth?: AuthRepository;
  tenancy?: TenancyRepository;
  planGating?: PlanGatingClient;
  audit?: EmployeesAuditClient;
  storage?: StorageClient;
  logger?: Logger;
  lookupPharmacySession?: PharmacySessionLookup;
  now?: () => Date;
  piiKey?: string;
}

export function createApp(env: EmployeesEnv = loadEmployeesEnv(), deps: EmployeesDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'employees-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const runtime: EmployeesRuntime = {
    employees: deps.employees ?? createMemoryEmployeesRepository(),
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
    logger: deps.logger ?? boot.logger,
    piiKey: deps.piiKey ?? env.EMPLOYEES_PII_KEY,
    storageBucket: env.EMPLOYEES_STORAGE_BUCKET,
    now: deps.now ?? (() => new Date()),
  };
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(getSummaryEndpoint, parseAuth, identity, createGetSummaryController(runtime));
  boot.attachRoute(
    listPharmacistEligibleEndpoint,
    parseAuth,
    identity,
    createListPharmacistEligibleController(runtime),
  );
  boot.attachRoute(exportCsvEndpoint, parseAuth, identity, createExportCsvController(runtime));
  boot.attachRoute(
    listEmployeesEndpoint,
    parseAuth,
    identity,
    createListEmployeesController(runtime),
  );
  boot.attachRoute(
    createEmployeeEndpoint,
    parseAuth,
    identity,
    createCreateEmployeeController(runtime),
  );
  boot.attachRoute(
    photoUploadUrlEndpoint,
    parseAuth,
    identity,
    createPhotoUploadUrlController(runtime),
  );
  boot.attachRoute(
    confirmPhotoEndpoint,
    parseAuth,
    identity,
    createConfirmPhotoController(runtime),
  );
  boot.attachRoute(
    documentUploadUrlEndpoint,
    parseAuth,
    identity,
    createDocumentUploadUrlController(runtime),
  );
  boot.attachRoute(
    createDocumentEndpoint,
    parseAuth,
    identity,
    createCreateDocumentController(runtime),
  );
  boot.attachRoute(
    deleteDocumentEndpoint,
    parseAuth,
    identity,
    createDeleteDocumentController(runtime),
  );
  boot.attachRoute(idCardEndpoint, parseAuth, identity, createGetIdCardController(runtime));
  boot.attachRoute(getEmployeeEndpoint, parseAuth, identity, createGetEmployeeController(runtime));
  boot.attachRoute(
    patchEmployeeEndpoint,
    parseAuth,
    identity,
    createPatchEmployeeController(runtime),
  );
  boot.attachRoute(
    deleteEmployeeEndpoint,
    parseAuth,
    identity,
    createDeleteEmployeeController(runtime),
  );

  return boot.complete();
}
