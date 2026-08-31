import { sql } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { locations, pharmacies } from './pharmacies.ts';

export const auditEvents = pgTable(
  'audit_events',
  {
    auditEventId: uuid('audit_event_id').primaryKey(),
    idempotencyKey: varchar('idempotency_key', { length: 256 }),
    tenantId: uuid('tenant_id').references(() => pharmacies.tenantId),
    locationId: uuid('location_id').references(() => locations.locationId),
    actorUserId: varchar('actor_user_id', { length: 128 }).notNull(),
    actorRole: varchar('actor_role', { length: 64 }).notNull(),
    actorSurface: varchar('actor_surface', { length: 16 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 128 }).notNull(),
    moneyOrStock: boolean('money_or_stock').notNull(),
    before: jsonb('before').$type<Record<string, unknown> | null>(),
    after: jsonb('after').$type<Record<string, unknown> | null>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
    clientOccurredAt: timestamp('client_occurred_at', { withTimezone: true, mode: 'date' }),
    requestId: varchar('request_id', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    uniqueIndex('audit_events_idempotency')
      .on(table.idempotencyKey)
      .where(sql`idempotency_key is not null`),
  ],
);
