import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const pharmacies = pgTable('pharmacies', {
  tenantId: uuid('tenant_id').primaryKey(),
  gstDealerType: text('gst_dealer_type').notNull(),
  businessType: text('business_type').notNull(),
  kycStatus: text('kyc_status').notNull().default('not_submitted'),
  kycSubmittedAt: timestamp('kyc_submitted_at', { withTimezone: true, mode: 'date' }),
  kycDecidedAt: timestamp('kyc_decided_at', { withTimezone: true, mode: 'date' }),
  kycRejectReason: text('kyc_reject_reason'),
  kycGstin: varchar('kyc_gstin', { length: 15 }),
  kycPan: varchar('kyc_pan', { length: 10 }),
  kycDrugLicenceNo: varchar('kyc_drug_licence_no', { length: 64 }),
  kycDrugLicenceIssue: text('kyc_drug_licence_issue'),
  kycDrugLicenceExpiry: text('kyc_drug_licence_expiry'),
  kycFssaiNo: varchar('kyc_fssai_no', { length: 32 }),
  kycFssaiExpiry: text('kyc_fssai_expiry'),
  kycPharmacistName: varchar('kyc_pharmacist_name', { length: 160 }),
  kycPharmacistRegistrationNo: varchar('kyc_pharmacist_registration_no', { length: 64 }),
  kycPharmacistRegistrationExpiry: text('kyc_pharmacist_registration_expiry'),
  kycEInvoicingEnabled: boolean('kyc_e_invoicing_enabled').notNull().default(false),
  kycBankAccountHolder: varchar('kyc_bank_account_holder', { length: 160 }),
  kycBankAccountNumberCiphertext: text('kyc_bank_account_number_ciphertext'),
  kycBankIfsc: varchar('kyc_bank_ifsc', { length: 20 }),
  wizardStatus: text('wizard_status').notNull().default('not_started'),
  wizardCompletedAt: timestamp('wizard_completed_at', { withTimezone: true, mode: 'date' }),
  wizardProgress: jsonb('wizard_progress').notNull().default({}),
  kycPlan: varchar('kyc_plan', { length: 16 }),
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
