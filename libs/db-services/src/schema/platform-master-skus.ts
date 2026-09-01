import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const platformMasterSkus = pgTable('platform_master_skus', {
  platformMasterSkuId: uuid('platform_master_sku_id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  composition: varchar('composition', { length: 512 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 256 }),
  brand: varchar('brand', { length: 256 }),
  pack: varchar('pack', { length: 128 }),
  form: varchar('form', { length: 64 }),
  category: varchar('category', { length: 128 }).notNull(),
  schedule: varchar('schedule', { length: 8 }).notNull(),
  rxOnly: boolean('rx_only').notNull(),
  hsn: varchar('hsn', { length: 16 }).notNull(),
  gstSlab: integer('gst_slab').notNull(),
  dpcoCeiling: numeric('dpco_ceiling', { precision: 12, scale: 2 }),
  banned: boolean('banned').notNull().default(false),
  bannedAt: timestamp('banned_at', { withTimezone: true, mode: 'date' }),
  bannedByUserId: varchar('banned_by_user_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const platformMasterSkuSubstitutes = pgTable(
  'platform_master_sku_substitutes',
  {
    platformMasterSkuId: uuid('platform_master_sku_id')
      .notNull()
      .references(() => platformMasterSkus.platformMasterSkuId),
    substitutePlatformMasterSkuId: uuid('substitute_platform_master_sku_id')
      .notNull()
      .references(() => platformMasterSkus.platformMasterSkuId),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.platformMasterSkuId, table.substitutePlatformMasterSkuId],
    }),
  ],
);
