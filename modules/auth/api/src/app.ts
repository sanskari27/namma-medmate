import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createExpressApp,
  parseAuthorizationHeader,
  validateAuthorizationHeader,
} from '@namma-medmate/lambda-bootstrap';
import { loadAuthEnv } from './config/env.ts';
import { createGetSessionController } from './controllers/get-session.controller.ts';

export const getAuthSessionEndpoint = {
  method: 'get' as const,
  path: '/auth/session',
  operationId: 'getAuthSession',
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

export function createApp(env = loadAuthEnv()) {
  const boot = createExpressApp({
    serviceName: 'auth-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });

  boot.attachRoute(
    getAuthSessionEndpoint,
    parseAuthorizationHeader,
    validateAuthorizationHeader,
    createGetSessionController(env),
  );

  return boot.complete();
}
