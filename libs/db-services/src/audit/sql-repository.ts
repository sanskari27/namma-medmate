import type { Pool, QueryResult } from 'pg';
import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import { isUniqueViolation } from '../tenancy/errors.ts';
import type {
  ActorSurface,
  AuditEventRecord,
  AuditRepository,
  InsertAuditEventInput,
  InsertAuditEventResult,
  ListAuditEventsInput,
  ListAuditEventsResult,
} from './types.ts';

interface AuditRow {
  audit_event_id: string;
  idempotency_key: string | null;
  tenant_id: string | null;
  location_id: string | null;
  actor_user_id: string;
  actor_role: string;
  actor_surface: ActorSurface;
  action: string;
  target_type: string;
  target_id: string;
  money_or_stock: boolean;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: Date;
  client_occurred_at: Date | null;
  request_id: string | null;
  created_at: Date;
}

const SELECT = `select audit_event_id, idempotency_key, tenant_id, location_id, actor_user_id,
  actor_role, actor_surface, action, target_type, target_id, money_or_stock, before, after,
  occurred_at, client_occurred_at, request_id, created_at from audit_events`;

function mapRow(row: AuditRow): AuditEventRecord {
  return {
    auditEventId: row.audit_event_id,
    idempotencyKey: row.idempotency_key,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    actorSurface: row.actor_surface,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    moneyOrStock: row.money_or_stock,
    before: row.before,
    after: row.after,
    occurredAt: row.occurred_at,
    clientOccurredAt: row.client_occurred_at,
    requestId: row.request_id,
    createdAt: row.created_at,
  };
}

function firstRow(result: QueryResult<AuditRow>): AuditEventRecord | undefined {
  const row = result.rows[0];
  return row ? mapRow(row) : undefined;
}

export function createSqlAuditRepository(pool: Pool): AuditRepository {
  return {
    async insertEvent(input: InsertAuditEventInput): Promise<InsertAuditEventResult> {
      if (input.idempotencyKey) {
        const existing = await this.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          return { record: existing, deduped: true };
        }
      }
      const auditEventId = createId();
      try {
        const result = await pool.query<AuditRow>(
          `insert into audit_events (
            audit_event_id, idempotency_key, tenant_id, location_id, actor_user_id, actor_role,
            actor_surface, action, target_type, target_id, money_or_stock, before, after,
            occurred_at, client_occurred_at, request_id, created_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), $14, $15, now()
          ) returning audit_event_id, idempotency_key, tenant_id, location_id, actor_user_id,
            actor_role, actor_surface, action, target_type, target_id, money_or_stock, before, after,
            occurred_at, client_occurred_at, request_id, created_at`,
          [
            auditEventId,
            input.idempotencyKey ?? null,
            input.tenantId,
            input.locationId,
            input.actorUserId,
            input.actorRole,
            input.actorSurface,
            input.action,
            input.targetType,
            input.targetId,
            input.moneyOrStock,
            input.before ? JSON.stringify(input.before) : null,
            input.after ? JSON.stringify(input.after) : null,
            input.clientOccurredAt ?? null,
            input.requestId ?? null,
          ],
        );
        const created = firstRow(result);
        if (!created) {
          throw new Error('Audit event insert did not persist');
        }
        return { record: created, deduped: false };
      } catch (error) {
        if (input.idempotencyKey && isUniqueViolation(error)) {
          const existing = await this.findByIdempotencyKey(input.idempotencyKey);
          if (existing) {
            return { record: existing, deduped: true };
          }
        }
        throw error;
      }
    },

    async findById(auditEventId: string): Promise<AuditEventRecord | undefined> {
      const result = await pool.query<AuditRow>(`${SELECT} where audit_event_id = $1`, [
        auditEventId,
      ]);
      return firstRow(result);
    },

    async findByIdempotencyKey(idempotencyKey: string): Promise<AuditEventRecord | undefined> {
      const result = await pool.query<AuditRow>(`${SELECT} where idempotency_key = $1`, [
        idempotencyKey,
      ]);
      return firstRow(result);
    },

    async listEvents(input: ListAuditEventsInput): Promise<ListAuditEventsResult> {
      const afterId = decodeCursor(input.cursor);
      const params: unknown[] = [];
      const clauses: string[] = [];
      if (input.platformOnly) {
        clauses.push('tenant_id is null');
      } else {
        if (input.tenantId !== undefined) {
          params.push(input.tenantId);
          clauses.push(`tenant_id = $${params.length}`);
        }
        if (input.locationId !== undefined) {
          params.push(input.locationId);
          clauses.push(`location_id = $${params.length}`);
        }
      }
      if (input.actorUserId) {
        params.push(input.actorUserId);
        clauses.push(`actor_user_id = $${params.length}`);
      }
      if (input.action) {
        params.push(input.action);
        clauses.push(`action = $${params.length}`);
      }
      if (input.targetType) {
        params.push(input.targetType);
        clauses.push(`target_type = $${params.length}`);
      }
      if (input.targetId) {
        params.push(input.targetId);
        clauses.push(`target_id = $${params.length}`);
      }
      if (input.from) {
        params.push(input.from);
        clauses.push(`occurred_at >= $${params.length}`);
      }
      if (input.to) {
        params.push(input.to);
        clauses.push(`occurred_at <= $${params.length}`);
      }
      if (afterId) {
        params.push(afterId);
        clauses.push(`(occurred_at, audit_event_id) < (
          select occurred_at, audit_event_id from audit_events where audit_event_id = $${params.length}
        )`);
      }
      params.push(input.limit + 1);
      const where = clauses.length > 0 ? ` where ${clauses.join(' and ')}` : '';
      const result = await pool.query<AuditRow>(
        `${SELECT}${where} order by occurred_at desc, audit_event_id desc limit $${params.length}`,
        params,
      );
      const hasMore = result.rows.length > input.limit;
      const items = (hasMore ? result.rows.slice(0, input.limit) : result.rows).map(mapRow);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.auditEventId) : null,
      };
    },
  };
}
