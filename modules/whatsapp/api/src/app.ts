import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PharmacySessionLookup } from '@namma-medmate/auth-utils';
import { createExpressApp } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryTenancyRepository,
  createMemoryWhatsAppRepository,
  type TenancyRepository,
  type WhatsAppRepository,
} from '@namma-medmate/db-services';
import { loadWhatsAppEnv, type WhatsAppEnv } from './config/env.ts';
import { createAuthParser } from './http/parse-auth.ts';
import { createGraphMetaClient } from './meta/graph-client.ts';
import type { MetaClient } from './meta/client.ts';
import { ImmediateRetryScheduler, type RetryScheduler } from './send/retry-scheduler.ts';
import { createSendService } from './send/send-service.ts';
import { createSendMessageController } from './controllers/send-message.controller.ts';
import { createListMessagesController } from './controllers/list-messages.controller.ts';
import { createListMandatoryFailuresController } from './controllers/list-mandatory-failures.controller.ts';
import { createAcknowledgeMessageController } from './controllers/acknowledge-message.controller.ts';
import { createShareDeeplinkController } from './controllers/share-deeplink.controller.ts';
import { createListTemplatesController } from './controllers/list-templates.controller.ts';
import {
  createMetaWebhookController,
  createMetaWebhookParser,
} from './controllers/meta-webhook.controller.ts';

export const sendMessageEndpoint = {
  method: 'post' as const,
  path: '/whatsapp/messages',
  operationId: 'sendWhatsAppMessage',
  successStatus: 202,
};

export const listMessagesEndpoint = {
  method: 'get' as const,
  path: '/whatsapp/messages',
  operationId: 'listWhatsAppMessages',
};

export const listMandatoryFailuresEndpoint = {
  method: 'get' as const,
  path: '/whatsapp/mandatory-failures',
  operationId: 'listWhatsAppMandatoryFailures',
};

export const acknowledgeMessageEndpoint = {
  method: 'post' as const,
  path: '/whatsapp/messages/:message_id/acknowledge',
  operationId: 'acknowledgeWhatsAppMessage',
};

export const shareDeeplinkEndpoint = {
  method: 'post' as const,
  path: '/whatsapp/share-deeplink',
  operationId: 'createWhatsAppShareDeeplink',
};

export const listTemplatesEndpoint = {
  method: 'get' as const,
  path: '/whatsapp/templates',
  operationId: 'listWhatsAppTemplates',
};

export const metaWebhookEndpoint = {
  method: 'post' as const,
  path: '/whatsapp/webhooks/meta',
  operationId: 'receiveWhatsAppMetaWebhook',
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

export interface WhatsAppAppDeps {
  tenancy?: TenancyRepository;
  messages?: WhatsAppRepository;
  meta?: MetaClient;
  scheduler?: RetryScheduler;
  lookupPharmacySession?: PharmacySessionLookup;
}

export function createApp(env = loadWhatsAppEnv(), deps: WhatsAppAppDeps = {}) {
  const boot = createExpressApp({
    serviceName: 'whatsapp-api',
    logLevel: env.LOG_LEVEL,
    apiSpecPath: resolveApiSpecPath(),
  });
  const tenancy = deps.tenancy ?? createMemoryTenancyRepository();
  const messages = deps.messages ?? createMemoryWhatsAppRepository();
  const meta = deps.meta ?? createGraphMetaClient(env);
  const scheduler = deps.scheduler ?? new ImmediateRetryScheduler();
  const send = createSendService({
    tenancy,
    messages,
    meta,
    scheduler,
    logger: boot.logger,
  });
  const parseAuth = createAuthParser(env, deps.lookupPharmacySession);

  boot.attachRoute(
    sendMessageEndpoint,
    parseAuth,
    identity,
    createSendMessageController(send),
    (res, output) => {
      if (output.data.deduped) {
        res.status(200);
      }
    },
  );
  boot.attachRoute(
    listMessagesEndpoint,
    parseAuth,
    identity,
    createListMessagesController(messages),
  );
  boot.attachRoute(
    listMandatoryFailuresEndpoint,
    parseAuth,
    identity,
    createListMandatoryFailuresController(messages),
  );
  boot.attachRoute(
    acknowledgeMessageEndpoint,
    parseAuth,
    identity,
    createAcknowledgeMessageController(messages, boot.logger),
  );
  boot.attachRoute(
    shareDeeplinkEndpoint,
    parseAuth,
    identity,
    createShareDeeplinkController(tenancy),
  );
  boot.attachRoute(listTemplatesEndpoint, parseAuth, identity, createListTemplatesController());
  boot.attachRoute(
    metaWebhookEndpoint,
    createMetaWebhookParser(env),
    identity,
    createMetaWebhookController(messages, boot.logger),
  );

  return boot.complete();
}

export type { WhatsAppEnv };
