import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import { createMemoryTenancyRepository, type TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { loadPlanGatingEnv } from './config/env.ts';
import { createGetEntitlementsController } from './controllers/get-entitlements.controller.ts';
import { createGetPaywallController } from './controllers/get-paywall.controller.ts';
import { createGetPlansController } from './controllers/get-plans.controller.ts';
import { createGetRoleDefaultsController } from './controllers/get-role-defaults.controller.ts';
import { createPostEvaluateController } from './controllers/post-evaluate.controller.ts';
import { MemoryOverrideReader, type OverrideReader } from './deps/overrides.ts';
import { MemorySeatsReader, type SeatsReader } from './deps/seats.ts';
import { MemorySubscriptionReader, type SubscriptionReader } from './deps/subscription.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { localSeedPharmacy } from './local-seed.ts';

export const getEntitlementsEndpoint = {
  method: 'get' as const,
  path: '/plan-gating/entitlements',
  operationId: 'getPlanGatingEntitlements',
};

export const getPlansEndpoint = {
  method: 'get' as const,
  path: '/plan-gating/plans',
  operationId: 'listPlanGatingPlans',
};

export const getPaywallEndpoint = {
  method: 'get' as const,
  path: '/plan-gating/paywall',
  operationId: 'getPlanGatingPaywall',
};

export const getRoleDefaultsEndpoint = {
  method: 'get' as const,
  path: '/plan-gating/role-defaults',
  operationId: 'getPlanGatingRoleDefaults',
};

export const postEvaluateEndpoint = {
  method: 'post' as const,
  path: '/plan-gating/evaluate',
  operationId: 'evaluatePlanGatingAccess',
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

export interface PlanGatingDeps {
  tenancy: TenancyRepository;
  subscriptions: SubscriptionReader;
  overrides: OverrideReader;
  seats: SeatsReader;
  logger?: Logger;
}

export function createDefaultDeps(): PlanGatingDeps {
  return {
    tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
    subscriptions: new MemorySubscriptionReader(),
    overrides: new MemoryOverrideReader(),
    seats: new MemorySeatsReader(),
  };
}

export function createApp(env = loadPlanGatingEnv(), deps: PlanGatingDeps = createDefaultDeps()) {
  const boot = createExpressApp({
    serviceName: 'plan-gating-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const parseAuth = createAuthParser(env);
  const logger = deps.logger ?? boot.logger;
  const wired = { ...deps, logger };

  boot.attachRoute(
    getEntitlementsEndpoint,
    parseAuth,
    identity,
    createGetEntitlementsController(wired),
  );
  boot.attachRoute(getPlansEndpoint, parseAuth, identity, createGetPlansController());
  boot.attachRoute(getPaywallEndpoint, parseAuth, identity, createGetPaywallController(wired));
  boot.attachRoute(getRoleDefaultsEndpoint, parseAuth, identity, createGetRoleDefaultsController());
  boot.attachRoute(postEvaluateEndpoint, parseAuth, identity, createPostEvaluateController(wired));

  return boot.complete();
}
