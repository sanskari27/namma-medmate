import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { locations, pharmacies } from './pharmacies.ts';

export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    messageId: uuid('message_id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => pharmacies.tenantId),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.locationId),
    templateKey: varchar('template_key', { length: 64 }).notNull(),
    to: varchar('to_e164', { length: 20 }).notNull(),
    purpose: varchar('purpose', { length: 32 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    billId: varchar('bill_id', { length: 64 }),
    campaignId: varchar('campaign_id', { length: 64 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    mandatory: boolean('mandatory').notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true, mode: 'date' }),
    acknowledgedByUserId: varchar('acknowledged_by_user_id', { length: 128 }),
    retryCount: integer('retry_count').notNull(),
    metaMessageId: varchar('meta_message_id', { length: 256 }),
    lastErrorCode: varchar('last_error_code', { length: 64 }),
    paramsRedacted: jsonb('params_redacted').$type<Record<string, unknown>>().notNull(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('whatsapp_messages_bill_dedupe')
      .on(table.templateKey, table.to, table.billId)
      .where(sql`bill_id is not null`),
    uniqueIndex('whatsapp_messages_idem_dedupe').on(
      table.templateKey,
      table.to,
      table.idempotencyKey,
    ),
  ],
);
