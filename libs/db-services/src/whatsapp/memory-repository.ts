import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import { cloneWhatsAppMessage } from './clone.ts';
import type {
  InsertWhatsAppMessageInput,
  ListWhatsAppMessagesInput,
  ListWhatsAppMessagesResult,
  WhatsAppMessageRecord,
  WhatsAppRepository,
} from './types.ts';

function notFound(): AppError {
  return new AppError(
    'WhatsApp message not found',
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    undefined,
    'whatsapp.errors.notFound',
  );
}

export function createMemoryWhatsAppRepository(
  now: () => Date = () => new Date(),
): WhatsAppRepository {
  const rows = new Map<string, WhatsAppMessageRecord>();

  function matchesDuplicate(
    row: WhatsAppMessageRecord,
    input: {
      templateKey: InsertWhatsAppMessageInput['templateKey'];
      to: string;
      billId: string | null;
      idempotencyKey: string;
    },
  ): boolean {
    if (row.templateKey !== input.templateKey || row.to !== input.to) {
      return false;
    }
    if (input.billId) {
      return row.billId === input.billId;
    }
    return row.idempotencyKey === input.idempotencyKey;
  }

  return {
    async insertQueued(input: InsertWhatsAppMessageInput): Promise<WhatsAppMessageRecord> {
      const createdAt = now();
      const record: WhatsAppMessageRecord = {
        messageId: createId(),
        tenantId: input.tenantId,
        locationId: input.locationId,
        templateKey: input.templateKey,
        to: input.to,
        purpose: input.purpose,
        status: 'queued',
        billId: input.billId,
        campaignId: input.campaignId,
        idempotencyKey: input.idempotencyKey,
        mandatory: input.mandatory,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        retryCount: 0,
        metaMessageId: null,
        lastErrorCode: null,
        paramsRedacted: { ...input.paramsRedacted },
        leaseExpiresAt: null,
        createdAt,
        updatedAt: createdAt,
        lastAttemptAt: null,
      };
      rows.set(record.messageId, record);
      return cloneWhatsAppMessage(record);
    },

    async findById(messageId: string): Promise<WhatsAppMessageRecord | undefined> {
      const row = rows.get(messageId);
      return row ? cloneWhatsAppMessage(row) : undefined;
    },

    async findDuplicate(input): Promise<WhatsAppMessageRecord | undefined> {
      for (const row of rows.values()) {
        if (matchesDuplicate(row, input)) {
          return cloneWhatsAppMessage(row);
        }
      }
      return undefined;
    },

    async findByMetaMessageId(metaMessageId: string): Promise<WhatsAppMessageRecord | undefined> {
      for (const row of rows.values()) {
        if (row.metaMessageId === metaMessageId) {
          return cloneWhatsAppMessage(row);
        }
      }
      return undefined;
    },

    async listInbox(input: ListWhatsAppMessagesInput): Promise<ListWhatsAppMessagesResult> {
      const afterId = decodeCursor(input.cursor);
      const after = afterId ? rows.get(afterId) : undefined;
      const filtered = [...rows.values()]
        .filter((row) => row.tenantId === input.tenantId && row.locationId === input.locationId)
        .filter((row) => (input.status ? row.status === input.status : true))
        .filter((row) => (input.templateKey ? row.templateKey === input.templateKey : true))
        .sort((a, b) => {
          const time = b.createdAt.getTime() - a.createdAt.getTime();
          return time !== 0 ? time : b.messageId.localeCompare(a.messageId);
        })
        .filter((row) => {
          if (!after) {
            return true;
          }
          if (row.createdAt.getTime() < after.createdAt.getTime()) {
            return true;
          }
          return (
            row.createdAt.getTime() === after.createdAt.getTime() && row.messageId < after.messageId
          );
        });
      const page = filtered.slice(0, input.limit + 1);
      const hasMore = page.length > input.limit;
      const items = (hasMore ? page.slice(0, input.limit) : page).map(cloneWhatsAppMessage);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.messageId) : null,
      };
    },

    async listMandatoryFailures(input): Promise<WhatsAppMessageRecord[]> {
      return [...rows.values()]
        .filter(
          (row) =>
            row.tenantId === input.tenantId &&
            row.locationId === input.locationId &&
            row.mandatory &&
            row.status === 'failed' &&
            !row.acknowledgedAt,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(cloneWhatsAppMessage);
    },

    async acquireLease(messageId, expiresAt): Promise<WhatsAppMessageRecord | undefined> {
      const row = rows.get(messageId);
      if (!row) {
        return undefined;
      }
      const now = new Date();
      if (row.leaseExpiresAt && row.leaseExpiresAt > now) {
        return undefined;
      }
      row.leaseExpiresAt = expiresAt;
      row.updatedAt = now;
      return cloneWhatsAppMessage(row);
    },

    async markAttempt(input): Promise<WhatsAppMessageRecord> {
      const row = rows.get(input.messageId);
      if (!row) {
        throw notFound();
      }
      const now = new Date();
      row.status = input.status;
      row.retryCount = input.retryCount;
      row.metaMessageId = input.metaMessageId ?? row.metaMessageId;
      row.lastErrorCode = input.lastErrorCode ?? null;
      row.lastAttemptAt = now;
      row.updatedAt = now;
      row.leaseExpiresAt = null;
      return cloneWhatsAppMessage(row);
    },

    async updateStatus(input): Promise<WhatsAppMessageRecord | undefined> {
      const row = rows.get(input.messageId);
      if (!row) {
        return undefined;
      }
      row.status = input.status;
      if (input.lastErrorCode !== undefined) {
        row.lastErrorCode = input.lastErrorCode;
      }
      row.updatedAt = new Date();
      return cloneWhatsAppMessage(row);
    },

    async acknowledge(input): Promise<WhatsAppMessageRecord> {
      const row = rows.get(input.messageId);
      if (!row) {
        throw notFound();
      }
      row.acknowledgedAt = input.at;
      row.acknowledgedByUserId = input.actorUserId;
      row.updatedAt = input.at;
      return cloneWhatsAppMessage(row);
    },
  };
}
