import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryAuditRepository,
  createMemoryTenancyRepository,
  type AuditRepository,
  type TenancyRepository,
} from '@namma-medmate/db-services';
import { loadAuditEnv, type AuditEnv } from './config/env.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { createIngestEventController } from './controllers/ingest-event.controller.ts';
import { createListEventsController } from './controllers/list-events.controller.ts';
import { createGetEventController } from './controllers/get-event.controller.ts';

export const ingestEventEndpoint = {
  method: 'post' as const,
  path: '/audit/events',
  operationId: 'ingestAuditEvent',
  successStatus: 201,
};

export const listEventsEndpoint = {
  method: 'get' as const,
  path: '/audit/events',
  operationId: 'listAuditEvents',
};

export const getEventEndpoint = {
  method: 'get' as const,
  path: '/audit/events/:audit_event_id',
  operationId: 'getAuditEvent',
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

export interface AuditAppDeps {
  tenancy?: TenancyRepository;
  events?: AuditRepository;
  lookupPharmacySession?: PharmacySessionLookup;
}

export function createApp(env = loadAuditEnv(), deps: AuditAppDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'audit-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const tenancy = deps.tenancy ?? createMemoryTenancyRepository();
  const events = deps.events ?? createMemoryAuditRepository();
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(
    ingestEventEndpoint,
    parseAuth,
    identity,
    createIngestEventController(events, tenancy, boot.logger),
    (res, output) => {
      if (output.data.deduped) {
        res.status(200);
      }
    },
  );
  boot.attachRoute(listEventsEndpoint, parseAuth, identity, createListEventsController(events));
  boot.attachRoute(getEventEndpoint, parseAuth, identity, createGetEventController(events));

  return boot.complete();
}

export type { AuditEnv };
