import { createId } from '@namma-medmate/id-generator';
import { decodeCursor, encodeCursor } from '@namma-medmate/pagination-utils';
import { cloneAuditEvent } from './clone.ts';
import type {
  AuditEventRecord,
  AuditRepository,
  InsertAuditEventInput,
  InsertAuditEventResult,
  ListAuditEventsInput,
  ListAuditEventsResult,
} from './types.ts';

function newerThanCursor(row: AuditEventRecord, after: AuditEventRecord): boolean {
  if (row.occurredAt.getTime() < after.occurredAt.getTime()) {
    return true;
  }
  return (
    row.occurredAt.getTime() === after.occurredAt.getTime() && row.auditEventId < after.auditEventId
  );
}

function matchesList(row: AuditEventRecord, input: ListAuditEventsInput): boolean {
  if (input.platformOnly) {
    if (row.tenantId !== null) {
      return false;
    }
  } else {
    if (input.tenantId !== undefined && row.tenantId !== input.tenantId) {
      return false;
    }
    if (input.locationId !== undefined && row.locationId !== input.locationId) {
      return false;
    }
  }
  if (input.actorUserId && row.actorUserId !== input.actorUserId) {
    return false;
  }
  if (input.action && row.action !== input.action) {
    return false;
  }
  if (input.targetType && row.targetType !== input.targetType) {
    return false;
  }
  if (input.targetId && row.targetId !== input.targetId) {
    return false;
  }
  if (input.from && row.occurredAt < input.from) {
    return false;
  }
  if (input.to && row.occurredAt > input.to) {
    return false;
  }
  return true;
}

export function createMemoryAuditRepository(now: () => Date = () => new Date()): AuditRepository {
  const rows = new Map<string, AuditEventRecord>();

  return {
    async insertEvent(input: InsertAuditEventInput): Promise<InsertAuditEventResult> {
      if (input.idempotencyKey) {
        for (const row of rows.values()) {
          if (row.idempotencyKey === input.idempotencyKey) {
            return { record: cloneAuditEvent(row), deduped: true };
          }
        }
      }
      const occurredAt = now();
      const record: AuditEventRecord = {
        auditEventId: createId(),
        idempotencyKey: input.idempotencyKey ?? null,
        tenantId: input.tenantId,
        locationId: input.locationId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorSurface: input.actorSurface,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        moneyOrStock: input.moneyOrStock,
        before: input.before ?? null,
        after: input.after ?? null,
        occurredAt,
        clientOccurredAt: input.clientOccurredAt ?? null,
        requestId: input.requestId ?? null,
        createdAt: occurredAt,
      };
      rows.set(record.auditEventId, record);
      return { record: cloneAuditEvent(record), deduped: false };
    },

    async findById(auditEventId: string): Promise<AuditEventRecord | undefined> {
      const row = rows.get(auditEventId);
      return row ? cloneAuditEvent(row) : undefined;
    },

    async findByIdempotencyKey(idempotencyKey: string): Promise<AuditEventRecord | undefined> {
      for (const row of rows.values()) {
        if (row.idempotencyKey === idempotencyKey) {
          return cloneAuditEvent(row);
        }
      }
      return undefined;
    },

    async listEvents(input: ListAuditEventsInput): Promise<ListAuditEventsResult> {
      const afterId = decodeCursor(input.cursor);
      const after = afterId ? rows.get(afterId) : undefined;
      const filtered = [...rows.values()]
        .filter((row) => matchesList(row, input))
        .sort((a, b) => {
          const time = b.occurredAt.getTime() - a.occurredAt.getTime();
          return time !== 0 ? time : b.auditEventId.localeCompare(a.auditEventId);
        })
        .filter((row) => (after ? newerThanCursor(row, after) : true));
      const page = filtered.slice(0, input.limit + 1);
      const hasMore = page.length > input.limit;
      const items = (hasMore ? page.slice(0, input.limit) : page).map(cloneAuditEvent);
      return {
        items,
        nextCursor: hasMore ? encodeCursor(items[items.length - 1]!.auditEventId) : null,
      };
    },
  };
}
