import type { Pool, QueryResult } from 'pg';
import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import type {
  InsertWhatsAppMessageInput,
  ListWhatsAppMessagesInput,
  ListWhatsAppMessagesResult,
  WhatsAppMessageRecord,
  WhatsAppPurpose,
  WhatsAppRepository,
  WhatsAppStatus,
  WhatsAppTemplateKey,
} from './types.ts';

interface WhatsAppRow {
  message_id: string;
  tenant_id: string;
  location_id: string;
  template_key: WhatsAppTemplateKey;
  to_e164: string;
  purpose: WhatsAppPurpose;
  status: WhatsAppStatus;
  bill_id: string | null;
  campaign_id: string | null;
  idempotency_key: string;
  mandatory: boolean;
  acknowledged_at: Date | null;
  acknowledged_by_user_id: string | null;
  retry_count: number;
  meta_message_id: string | null;
  last_error_code: string | null;
  params_redacted: Record<string, unknown>;
  lease_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_attempt_at: Date | null;
}

const SELECT = `select message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
  bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
  retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
  created_at, updated_at, last_attempt_at from whatsapp_messages`;

function mapRow(row: WhatsAppRow): WhatsAppMessageRecord {
  return {
    messageId: row.message_id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    templateKey: row.template_key,
    to: row.to_e164,
    purpose: row.purpose,
    status: row.status,
    billId: row.bill_id,
    campaignId: row.campaign_id,
    idempotencyKey: row.idempotency_key,
    mandatory: row.mandatory,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedByUserId: row.acknowledged_by_user_id,
    retryCount: row.retry_count,
    metaMessageId: row.meta_message_id,
    lastErrorCode: row.last_error_code,
    paramsRedacted: row.params_redacted,
    leaseExpiresAt: row.lease_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAttemptAt: row.last_attempt_at,
  };
}

function notFound(): AppError {
  return new AppError(
    'WhatsApp message not found',
    ErrorCode.NOT_FOUND,
    HttpStatus.NOT_FOUND,
    undefined,
    'whatsapp.errors.notFound',
  );
}

function firstRow(result: QueryResult<WhatsAppRow>): WhatsAppMessageRecord | undefined {
  const row = result.rows[0];
  return row ? mapRow(row) : undefined;
}

export function createSqlWhatsAppRepository(pool: Pool): WhatsAppRepository {
  return {
    async insertQueued(input: InsertWhatsAppMessageInput): Promise<WhatsAppMessageRecord> {
      const messageId = createId();
      const result = await pool.query<WhatsAppRow>(
        `insert into whatsapp_messages (
          message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, retry_count, params_redacted,
          created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, 'queued', $7, $8, $9, $10, 0, $11, now(), now()
        ) returning message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
          retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
          created_at, updated_at, last_attempt_at`,
        [
          messageId,
          input.tenantId,
          input.locationId,
          input.templateKey,
          input.to,
          input.purpose,
          input.billId,
          input.campaignId,
          input.idempotencyKey,
          input.mandatory,
          JSON.stringify(input.paramsRedacted),
        ],
      );
      const created = firstRow(result);
      if (!created) {
        throw new Error('WhatsApp message insert did not persist');
      }
      return created;
    },

    async findById(messageId: string): Promise<WhatsAppMessageRecord | undefined> {
      const result = await pool.query<WhatsAppRow>(`${SELECT} where message_id = $1`, [messageId]);
      return firstRow(result);
    },

    async findDuplicate(input): Promise<WhatsAppMessageRecord | undefined> {
      if (input.billId) {
        const result = await pool.query<WhatsAppRow>(
          `${SELECT} where template_key = $1 and to_e164 = $2 and bill_id = $3`,
          [input.templateKey, input.to, input.billId],
        );
        return firstRow(result);
      }
      const result = await pool.query<WhatsAppRow>(
        `${SELECT} where template_key = $1 and to_e164 = $2 and idempotency_key = $3`,
        [input.templateKey, input.to, input.idempotencyKey],
      );
      return firstRow(result);
    },

    async findByMetaMessageId(metaMessageId: string): Promise<WhatsAppMessageRecord | undefined> {
      const result = await pool.query<WhatsAppRow>(`${SELECT} where meta_message_id = $1`, [
        metaMessageId,
      ]);
      return firstRow(result);
    },

    async listInbox(input: ListWhatsAppMessagesInput): Promise<ListWhatsAppMessagesResult> {
      const afterId = decodeCursor(input.cursor);
      const params: unknown[] = [input.tenantId, input.locationId];
      let sql = `${SELECT} where tenant_id = $1 and location_id = $2`;
      if (input.status) {
        params.push(input.status);
        sql += ` and status = $${params.length}`;
      }
      if (input.templateKey) {
        params.push(input.templateKey);
        sql += ` and template_key = $${params.length}`;
      }
      if (afterId) {
        params.push(afterId);
        sql += ` and (created_at, message_id) < (
          select created_at, message_id from whatsapp_messages where message_id = $${params.length}
        )`;
      }
      params.push(input.limit + 1);
      sql += ` order by created_at desc, message_id desc limit $${params.length}`;
      const result = await pool.query<WhatsAppRow>(sql, params);
      const hasMore = result.rows.length > input.limit;
      const items = (hasMore ? result.rows.slice(0, input.limit) : result.rows).map(mapRow);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.messageId) : null,
      };
    },

    async listMandatoryFailures(input): Promise<WhatsAppMessageRecord[]> {
      const result = await pool.query<WhatsAppRow>(
        `${SELECT} where tenant_id = $1 and location_id = $2 and mandatory = true
          and status = 'failed' and acknowledged_at is null
          order by created_at desc`,
        [input.tenantId, input.locationId],
      );
      return result.rows.map(mapRow);
    },

    async acquireLease(messageId, expiresAt): Promise<WhatsAppMessageRecord | undefined> {
      const result = await pool.query<WhatsAppRow>(
        `update whatsapp_messages set lease_expires_at = $2, updated_at = now()
          where message_id = $1 and (lease_expires_at is null or lease_expires_at < now())
          returning message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
          retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
          created_at, updated_at, last_attempt_at`,
        [messageId, expiresAt],
      );
      return firstRow(result);
    },

    async markAttempt(input): Promise<WhatsAppMessageRecord> {
      const result = await pool.query<WhatsAppRow>(
        `update whatsapp_messages set status = $2, retry_count = $3, meta_message_id = coalesce($4, meta_message_id),
          last_error_code = $5, last_attempt_at = now(), updated_at = now(), lease_expires_at = null
          where message_id = $1
          returning message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
          retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
          created_at, updated_at, last_attempt_at`,
        [
          input.messageId,
          input.status,
          input.retryCount,
          input.metaMessageId ?? null,
          input.lastErrorCode ?? null,
        ],
      );
      const updated = firstRow(result);
      if (!updated) {
        throw notFound();
      }
      return updated;
    },

    async updateStatus(input): Promise<WhatsAppMessageRecord | undefined> {
      const result = await pool.query<WhatsAppRow>(
        `update whatsapp_messages set status = $2, last_error_code = coalesce($3, last_error_code),
          updated_at = now() where message_id = $1
          returning message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
          retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
          created_at, updated_at, last_attempt_at`,
        [input.messageId, input.status, input.lastErrorCode ?? null],
      );
      return firstRow(result);
    },

    async acknowledge(input): Promise<WhatsAppMessageRecord> {
      const result = await pool.query<WhatsAppRow>(
        `update whatsapp_messages set acknowledged_at = $2, acknowledged_by_user_id = $3, updated_at = $2
          where message_id = $1
          returning message_id, tenant_id, location_id, template_key, to_e164, purpose, status,
          bill_id, campaign_id, idempotency_key, mandatory, acknowledged_at, acknowledged_by_user_id,
          retry_count, meta_message_id, last_error_code, params_redacted, lease_expires_at,
          created_at, updated_at, last_attempt_at`,
        [input.messageId, input.at, input.actorUserId],
      );
      const updated = firstRow(result);
      if (!updated) {
        throw notFound();
      }
      return updated;
    },
  };
}
