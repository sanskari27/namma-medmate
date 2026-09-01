import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import {
  createMemoryAuthRepository,
  createMemoryTenancyRepository,
  type AuthRepository,
  type TenancyRepository,
} from '@namma-medmate/db-services';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import type { Logger } from '@namma-medmate/logger';
import { MemoryAuditClient, type ManageUsersAuditClient } from './audit/client.ts';
import { createHttpAuditClient } from './audit/http-client.ts';
import { loadManageUsersEnv, type ManageUsersEnv } from './config/env.ts';
import { createCopyPasswordController } from './controllers/copy-password.controller.ts';
import { createCreateUserController } from './controllers/create-user.controller.ts';
import { createDeletePinController } from './controllers/delete-pin.controller.ts';
import { createGetSeatsController } from './controllers/get-seats.controller.ts';
import { createGetUserController } from './controllers/get-user.controller.ts';
import { createListDevicesController } from './controllers/list-devices.controller.ts';
import { createListUsersController } from './controllers/list-users.controller.ts';
import { createPatchUserController } from './controllers/patch-user.controller.ts';
import { createPutMethodsController } from './controllers/put-methods.controller.ts';
import { createPutPermissionsController } from './controllers/put-permissions.controller.ts';
import { createPutPinController } from './controllers/put-pin.controller.ts';
import { createRemoveUserController } from './controllers/remove-user.controller.ts';
import { createResetPasswordController } from './controllers/reset-password.controller.ts';
import { createRevokeAllDevicesController } from './controllers/revoke-all-devices.controller.ts';
import { createRevokeDeviceController } from './controllers/revoke-device.controller.ts';
import { createShareLinkController } from './controllers/share-link.controller.ts';
import { MemoryEmployeesLookup, type EmployeesLookup } from './employees/lookup.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { localSeedPharmacy } from './local-seed.ts';
import { MemoryPlanGatingClient, type PlanGatingClient } from './plan-gating/client.ts';
import { createHttpPlanGatingClient } from './plan-gating/http-client.ts';
import type { ManageUsersRuntime } from './runtime.ts';

export const getSeatsEndpoint = {
  method: 'get' as const,
  path: '/manage-users/seats',
  operationId: 'getManageUsersSeats',
};
export const listUsersEndpoint = {
  method: 'get' as const,
  path: '/manage-users/users',
  operationId: 'listManageUsers',
};
export const createUserEndpoint = {
  method: 'post' as const,
  path: '/manage-users/users',
  operationId: 'createManageUser',
  successStatus: 201,
};
export const getUserEndpoint = {
  method: 'get' as const,
  path: '/manage-users/users/:user_id',
  operationId: 'getManageUser',
};
export const patchUserEndpoint = {
  method: 'patch' as const,
  path: '/manage-users/users/:user_id',
  operationId: 'patchManageUser',
};
export const putPermissionsEndpoint = {
  method: 'put' as const,
  path: '/manage-users/users/:user_id/permissions',
  operationId: 'putManageUserPermissions',
};
export const putMethodsEndpoint = {
  method: 'put' as const,
  path: '/manage-users/users/:user_id/methods',
  operationId: 'putManageUserMethods',
};
export const resetPasswordEndpoint = {
  method: 'post' as const,
  path: '/manage-users/users/:user_id/password/reset',
  operationId: 'resetManageUserPassword',
};
export const copyPasswordEndpoint = {
  method: 'post' as const,
  path: '/manage-users/users/:user_id/password/copy',
  operationId: 'copyManageUserPassword',
};
export const putPinEndpoint = {
  method: 'put' as const,
  path: '/manage-users/users/:user_id/pin',
  operationId: 'putManageUserPin',
};
export const deletePinEndpoint = {
  method: 'delete' as const,
  path: '/manage-users/users/:user_id/pin',
  operationId: 'deleteManageUserPin',
};
export const listDevicesEndpoint = {
  method: 'get' as const,
  path: '/manage-users/users/:user_id/devices',
  operationId: 'listManageUserDevices',
};
export const revokeAllDevicesEndpoint = {
  method: 'delete' as const,
  path: '/manage-users/users/:user_id/devices',
  operationId: 'revokeAllManageUserDevices',
};
export const revokeDeviceEndpoint = {
  method: 'delete' as const,
  path: '/manage-users/users/:user_id/devices/:device_id',
  operationId: 'revokeManageUserDevice',
};
export const shareLinkEndpoint = {
  method: 'post' as const,
  path: '/manage-users/users/:user_id/share-link',
  operationId: 'createManageUserShareLink',
};
export const removeUserEndpoint = {
  method: 'delete' as const,
  path: '/manage-users/users/:user_id',
  operationId: 'deleteManageUser',
  successStatus: 204,
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

export interface ManageUsersDeps {
  auth?: AuthRepository;
  tenancy?: TenancyRepository;
  planGating?: PlanGatingClient;
  employees?: EmployeesLookup;
  audit?: ManageUsersAuditClient;
  logger?: Logger;
  lookupPharmacySession?: PharmacySessionLookup;
  now?: () => Date;
  randomPassword?: () => string;
  tempPasswordKey?: string;
}

export function createApp(env: ManageUsersEnv = loadManageUsersEnv(), deps: ManageUsersDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'manage-users-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const runtime: ManageUsersRuntime = {
    auth: deps.auth ?? createMemoryAuthRepository(),
    tenancy: deps.tenancy ?? createMemoryTenancyRepository(localSeedPharmacy()),
    planGating:
      deps.planGating ??
      (env.PLAN_GATING_API_BASE_URL
        ? createHttpPlanGatingClient(env.PLAN_GATING_API_BASE_URL)
        : new MemoryPlanGatingClient()),
    employees: deps.employees ?? new MemoryEmployeesLookup(),
    audit:
      deps.audit ??
      (env.AUDIT_API_BASE_URL && env.AUDIT_SERVICE_TOKEN
        ? createHttpAuditClient(env.AUDIT_API_BASE_URL, env.AUDIT_SERVICE_TOKEN)
        : new MemoryAuditClient()),
    logger: deps.logger ?? boot.logger,
    tempPasswordKey: deps.tempPasswordKey ?? env.MANAGE_USERS_TEMP_PASSWORD_KEY,
    now: deps.now ?? (() => new Date()),
    randomPassword: deps.randomPassword,
  };
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(getSeatsEndpoint, parseAuth, identity, createGetSeatsController(runtime));
  boot.attachRoute(listUsersEndpoint, parseAuth, identity, createListUsersController(runtime));
  boot.attachRoute(createUserEndpoint, parseAuth, identity, createCreateUserController(runtime));
  boot.attachRoute(getUserEndpoint, parseAuth, identity, createGetUserController(runtime));
  boot.attachRoute(patchUserEndpoint, parseAuth, identity, createPatchUserController(runtime));
  boot.attachRoute(
    putPermissionsEndpoint,
    parseAuth,
    identity,
    createPutPermissionsController(runtime),
  );
  boot.attachRoute(putMethodsEndpoint, parseAuth, identity, createPutMethodsController(runtime));
  boot.attachRoute(
    resetPasswordEndpoint,
    parseAuth,
    identity,
    createResetPasswordController(runtime),
  );
  boot.attachRoute(
    copyPasswordEndpoint,
    parseAuth,
    identity,
    createCopyPasswordController(runtime),
  );
  boot.attachRoute(putPinEndpoint, parseAuth, identity, createPutPinController(runtime));
  boot.attachRoute(deletePinEndpoint, parseAuth, identity, createDeletePinController(runtime));
  boot.attachRoute(listDevicesEndpoint, parseAuth, identity, createListDevicesController(runtime));
  boot.attachRoute(
    revokeDeviceEndpoint,
    parseAuth,
    identity,
    createRevokeDeviceController(runtime),
  );
  boot.attachRoute(
    revokeAllDevicesEndpoint,
    parseAuth,
    identity,
    createRevokeAllDevicesController(runtime),
  );
  boot.attachRoute(shareLinkEndpoint, parseAuth, identity, createShareLinkController(runtime));
  boot.attachRoute(removeUserEndpoint, parseAuth, identity, createRemoveUserController(runtime));

  return boot.complete();
}
