import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import { createMemoryAuthRepository, type AuthRepository } from '@namma-medmate/db-services';
import { loadAuthEnv, type AuthEnv } from './config/env.ts';
import { createLoginPasswordController } from './controllers/login-password.controller.ts';
import { createRequestOtpController } from './controllers/request-otp.controller.ts';
import { createVerifyOtpController } from './controllers/verify-otp.controller.ts';
import { createVerifyPinController } from './controllers/verify-pin.controller.ts';
import { createGetSessionController } from './controllers/get-session.controller.ts';
import { createLogoutController } from './controllers/logout.controller.ts';
import { createListDevicesController } from './controllers/list-devices.controller.ts';
import { createRevokeDevicesController } from './controllers/revoke-devices.controller.ts';
import { MemoryAuditClient, type AuthAuditClient } from './audit/client.ts';
import { createHttpAuthAuditClient } from './audit/http-client.ts';
import { MemoryWhatsAppClient, type WhatsAppSendClient } from './whatsapp/client.ts';
import { createHttpWhatsAppClient } from './whatsapp/http-client.ts';
import { createOpaqueToken, createRandomOtp, type AuthRuntime } from './login/session.ts';

export const loginPasswordEndpoint = {
  method: 'post' as const,
  path: '/auth/login/password',
  operationId: 'loginWithPassword',
};

export const requestOtpEndpoint = {
  method: 'post' as const,
  path: '/auth/login/otp/request',
  operationId: 'requestLoginOtp',
};

export const verifyOtpEndpoint = {
  method: 'post' as const,
  path: '/auth/login/otp/verify',
  operationId: 'verifyLoginOtp',
};

export const verifyPinEndpoint = {
  method: 'post' as const,
  path: '/auth/pin/verify',
  operationId: 'verifyPin',
};

export const getAuthSessionEndpoint = {
  method: 'get' as const,
  path: '/auth/session',
  operationId: 'getAuthSession',
};

export const logoutEndpoint = {
  method: 'post' as const,
  path: '/auth/logout',
  operationId: 'logoutSession',
};

export const listDevicesEndpoint = {
  method: 'get' as const,
  path: '/auth/devices',
  operationId: 'listAuthDevices',
};

export const revokeDevicesEndpoint = {
  method: 'delete' as const,
  path: '/auth/devices',
  operationId: 'revokeAuthDevices',
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

export interface AuthAppDeps {
  auth?: AuthRepository;
  whatsapp?: WhatsAppSendClient;
  audit?: AuthAuditClient;
  now?: () => Date;
  randomOtp?: () => string;
  issueToken?: (prefix: string) => string;
}

export function createApp(env: AuthEnv = loadAuthEnv(), deps: AuthAppDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'auth-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const fixedOtp = env.AUTH_FIXED_OTP;
  const runtime: AuthRuntime = {
    auth: deps.auth ?? createMemoryAuthRepository(),
    whatsapp:
      deps.whatsapp ??
      (env.WHATSAPP_API_BASE_URL && env.WHATSAPP_SERVICE_TOKEN
        ? createHttpWhatsAppClient(env.WHATSAPP_API_BASE_URL, env.WHATSAPP_SERVICE_TOKEN)
        : new MemoryWhatsAppClient()),
    audit:
      deps.audit ??
      (env.AUDIT_API_BASE_URL && env.AUDIT_SERVICE_TOKEN
        ? createHttpAuthAuditClient(env.AUDIT_API_BASE_URL, env.AUDIT_SERVICE_TOKEN)
        : new MemoryAuditClient()),
    logger: boot.logger,
    now: deps.now ?? (() => new Date()),
    randomOtp: deps.randomOtp ?? (fixedOtp ? () => fixedOtp : createRandomOtp),
    issueToken: deps.issueToken ?? createOpaqueToken,
  };

  boot.attachRoute(
    loginPasswordEndpoint,
    identity,
    identity,
    createLoginPasswordController(runtime),
  );
  boot.attachRoute(requestOtpEndpoint, identity, identity, createRequestOtpController(runtime));
  boot.attachRoute(verifyOtpEndpoint, identity, identity, createVerifyOtpController(runtime));
  boot.attachRoute(verifyPinEndpoint, identity, identity, createVerifyPinController(runtime));
  boot.attachRoute(getAuthSessionEndpoint, identity, identity, createGetSessionController(runtime));
  boot.attachRoute(logoutEndpoint, identity, identity, createLogoutController(runtime));
  boot.attachRoute(listDevicesEndpoint, identity, identity, createListDevicesController(runtime));
  boot.attachRoute(
    revokeDevicesEndpoint,
    identity,
    identity,
    createRevokeDevicesController(runtime),
  );

  return boot.complete();
}

export type { AuthEnv };
