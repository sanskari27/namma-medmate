import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryMasterCatalogueRepository,
  createMemoryTenancyRepository,
  type MasterCatalogueRepository,
  type TenancyRepository,
} from '@namma-medmate/db-services';
import { MemoryAuditClient, type AuditIngestClient } from './audit/client.ts';
import { createHttpAuditClient } from './audit/http-client.ts';
import { loadMasterCatalogueEnv, type MasterCatalogueEnv } from './config/env.ts';
import { createAssertPriceController } from './controllers/assert-price.controller.ts';
import { createBanSkuController } from './controllers/ban-sku.controller.ts';
import { createCreateSkuController } from './controllers/create-sku.controller.ts';
import { createGetSkuController } from './controllers/get-sku.controller.ts';
import { createGetSubstitutesController } from './controllers/get-substitutes.controller.ts';
import { createListSkusController } from './controllers/list-skus.controller.ts';
import { createListStockingPharmaciesController } from './controllers/list-stocking-pharmacies.controller.ts';
import { createPatchSkuController } from './controllers/patch-sku.controller.ts';
import { createPutCeilingController } from './controllers/put-ceiling.controller.ts';
import { createPutSubstitutesController } from './controllers/put-substitutes.controller.ts';
import { createUnbanSkuController } from './controllers/unban-sku.controller.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { MemoryInventoryClient, type InventoryMappingsClient } from './inventory/client.ts';

export const listSkusEndpoint = {
  method: 'get' as const,
  path: '/master-catalogue/skus',
  operationId: 'listMasterSkus',
};

export const createSkuEndpoint = {
  method: 'post' as const,
  path: '/master-catalogue/skus',
  operationId: 'createMasterSku',
  successStatus: 201,
};

export const getSkuEndpoint = {
  method: 'get' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id',
  operationId: 'getMasterSku',
};

export const patchSkuEndpoint = {
  method: 'patch' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id',
  operationId: 'patchMasterSku',
};

export const listStockingEndpoint = {
  method: 'get' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/stocking-pharmacies',
  operationId: 'listStockingPharmacies',
};

export const putCeilingEndpoint = {
  method: 'put' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/ceiling',
  operationId: 'putMasterSkuCeiling',
};

export const banSkuEndpoint = {
  method: 'post' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/ban',
  operationId: 'banMasterSku',
};

export const unbanSkuEndpoint = {
  method: 'post' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/unban',
  operationId: 'unbanMasterSku',
};

export const putSubstitutesEndpoint = {
  method: 'put' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/substitutes',
  operationId: 'putMasterSkuSubstitutes',
};

export const getSubstitutesEndpoint = {
  method: 'get' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/substitutes',
  operationId: 'getMasterSkuSubstitutes',
};

export const assertPriceEndpoint = {
  method: 'post' as const,
  path: '/master-catalogue/skus/:platform_master_sku_id/assert-price',
  operationId: 'assertMasterSkuPrice',
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

export interface MasterCatalogueAppDeps {
  catalogue?: MasterCatalogueRepository;
  tenancy?: TenancyRepository;
  inventory?: InventoryMappingsClient;
  audit?: AuditIngestClient;
  lookupPharmacySession?: PharmacySessionLookup;
}

export function createApp(env = loadMasterCatalogueEnv(), deps: MasterCatalogueAppDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'master-catalogue-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const catalogue = deps.catalogue ?? createMemoryMasterCatalogueRepository();
  const tenancy = deps.tenancy ?? createMemoryTenancyRepository();
  const inventory = deps.inventory ?? new MemoryInventoryClient();
  const audit =
    deps.audit ??
    (env.AUDIT_API_BASE_URL && env.AUDIT_SERVICE_TOKEN
      ? createHttpAuditClient(env.AUDIT_API_BASE_URL, env.AUDIT_SERVICE_TOKEN, boot.logger)
      : new MemoryAuditClient());
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(listSkusEndpoint, parseAuth, identity, createListSkusController(catalogue));
  boot.attachRoute(
    createSkuEndpoint,
    parseAuth,
    identity,
    createCreateSkuController(catalogue, audit, boot.logger),
  );
  boot.attachRoute(getSkuEndpoint, parseAuth, identity, createGetSkuController(catalogue));
  boot.attachRoute(
    patchSkuEndpoint,
    parseAuth,
    identity,
    createPatchSkuController(catalogue, audit, boot.logger),
  );
  boot.attachRoute(
    listStockingEndpoint,
    parseAuth,
    identity,
    createListStockingPharmaciesController(catalogue, inventory, tenancy),
  );
  boot.attachRoute(
    putCeilingEndpoint,
    parseAuth,
    identity,
    createPutCeilingController(catalogue, audit, boot.logger),
  );
  boot.attachRoute(
    banSkuEndpoint,
    parseAuth,
    identity,
    createBanSkuController(catalogue, audit, inventory, boot.logger),
  );
  boot.attachRoute(
    unbanSkuEndpoint,
    parseAuth,
    identity,
    createUnbanSkuController(catalogue, audit, boot.logger),
  );
  boot.attachRoute(
    putSubstitutesEndpoint,
    parseAuth,
    identity,
    createPutSubstitutesController(catalogue, audit, boot.logger),
  );
  boot.attachRoute(
    getSubstitutesEndpoint,
    parseAuth,
    identity,
    createGetSubstitutesController(catalogue),
  );
  boot.attachRoute(
    assertPriceEndpoint,
    parseAuth,
    identity,
    createAssertPriceController(catalogue),
  );

  return boot.complete();
}

export type { MasterCatalogueEnv };
