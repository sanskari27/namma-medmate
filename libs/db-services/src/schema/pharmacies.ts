import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const pharmacies = pgTable('pharmacies', {
  tenantId: uuid('tenant_id').primaryKey(),
  gstDealerType: text('gst_dealer_type').notNull(),
  businessType: text('business_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const locations = pgTable('locations', {
  locationId: uuid('location_id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => pharmacies.tenantId)
    .unique(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});
