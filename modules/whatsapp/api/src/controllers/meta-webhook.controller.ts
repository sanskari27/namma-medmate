import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { hmacSha256 } from '@namma-medmate/encryption-utils';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { Logger } from '@namma-medmate/logger';
import type { WhatsAppRepository, WhatsAppStatus } from '@namma-medmate/db-services';
import type { WhatsAppEnv } from '../config/env.ts';
import { WhatsAppErrors } from '../errors.ts';
import { canAdvanceStatus } from '../send/send-service.ts';

interface MetaStatus {
  id?: string;
  status?: string;
}

interface MetaChange {
  value?: {
    statuses?: MetaStatus[];
    messages?: unknown[];
  };
}

interface MetaWebhookBody {
  entry?: Array<{ changes?: MetaChange[] }>;
}

const META_STATUS: Record<string, WhatsAppStatus> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

function signaturesMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createMetaWebhookParser(env: WhatsAppEnv) {
  return function parseWebhook(req: Request): Request {
    const raw = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const header = req.header('x-hub-signature-256') ?? '';
    const expected = `sha256=${hmacSha256(raw, env.META_WEBHOOK_APP_SECRET)}`;
    if (!signaturesMatch(header, expected)) {
      throw WhatsAppErrors.unauthorized();
    }
    return req;
  };
}

export function createMetaWebhookController(messages: WhatsAppRepository, logger: Logger) {
  return async function receiveWebhook(req: Request) {
    const body = req.body as MetaWebhookBody;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const inbound = change.value?.messages;
        if (inbound && inbound.length > 0) {
          continue;
        }
        for (const status of change.value?.statuses ?? []) {
          if (!status.id || !status.status) {
            continue;
          }
          const next = META_STATUS[status.status];
          if (!next) {
            continue;
          }
          const existing = await messages.findByMetaMessageId(status.id);
          if (!existing) {
            continue;
          }
          if (!canAdvanceStatus(existing.status, next)) {
            continue;
          }
          await messages.updateStatus({
            messageId: existing.messageId,
            status: next,
            lastErrorCode: next === 'failed' ? 'META_FAILED' : null,
          });
          logger.info('WhatsAppMessageStatusChanged', {
            message_id: existing.messageId,
            status: next,
            retry_count: existing.retryCount,
          });
        }
      }
    }
    return buildSuccess({ received: true });
  };
}
