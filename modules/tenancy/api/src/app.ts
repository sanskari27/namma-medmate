import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import { createMemoryTenancyRepository, type TenancyRepository } from '@namma-medmate/db-services';
import { loadTenancyEnv } from './config/env.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { createCreatePharmacyController } from './controllers/create-pharmacy.controller.ts';
import { createGetPharmacyController } from './controllers/get-pharmacy.controller.ts';
import { createListPharmaciesController } from './controllers/list-pharmacies.controller.ts';
import { createCreateLocationController } from './controllers/create-location.controller.ts';
import { createGetCurrentController } from './controllers/get-current.controller.ts';
import { createPatchCurrentController } from './controllers/patch-current.controller.ts';
import { createGetLocationController } from './controllers/get-location.controller.ts';

export const createPharmacyEndpoint = {
  method: 'post' as const,
  path: '/tenancy/pharmacies',
  operationId: 'createPharmacy',
  successStatus: 201,
};

export const listPharmaciesEndpoint = {
  method: 'get' as const,
  path: '/tenancy/pharmacies',
  operationId: 'listPharmacies',
};

export const getPharmacyEndpoint = {
  method: 'get' as const,
  path: '/tenancy/pharmacies/:tenant_id',
  operationId: 'getPharmacy',
};

export const createLocationEndpoint = {
  method: 'post' as const,
  path: '/tenancy/pharmacies/:tenant_id/locations',
  operationId: 'createLocation',
};

export const getCurrentEndpoint = {
  method: 'get' as const,
  path: '/tenancy/current',
  operationId: 'getCurrentPharmacy',
};

export const patchCurrentEndpoint = {
  method: 'patch' as const,
  path: '/tenancy/current',
  operationId: 'patchCurrentPharmacy',
};

export const getLocationEndpoint = {
  method: 'get' as const,
  path: '/tenancy/locations/:location_id',
  operationId: 'getLocation',
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

export function createApp(
  env = loadTenancyEnv(),
  repository: TenancyRepository = createMemoryTenancyRepository(),
) {
  const boot = createExpressApp({
    serviceName: 'tenancy-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const parseAuth = createAuthParser(env);

  boot.attachRoute(
    createPharmacyEndpoint,
    parseAuth,
    identity,
    createCreatePharmacyController(repository, boot.logger),
  );
  boot.attachRoute(
    listPharmaciesEndpoint,
    parseAuth,
    identity,
    createListPharmaciesController(repository),
  );
  boot.attachRoute(
    getPharmacyEndpoint,
    parseAuth,
    identity,
    createGetPharmacyController(repository),
  );
  boot.attachRoute(
    createLocationEndpoint,
    parseAuth,
    identity,
    createCreateLocationController(repository),
  );
  boot.attachRoute(getCurrentEndpoint, parseAuth, identity, createGetCurrentController(repository));
  boot.attachRoute(
    patchCurrentEndpoint,
    parseAuth,
    identity,
    createPatchCurrentController(repository, boot.logger),
  );
  boot.attachRoute(
    getLocationEndpoint,
    parseAuth,
    identity,
    createGetLocationController(repository),
  );

  return boot.complete();
}
