import { pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { locations, pharmacies } from './pharmacies.ts';

export const employees = pgTable('employees', {
  employeeId: uuid('employee_id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => pharmacies.tenantId),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.locationId),
  employeeCode: varchar('employee_code', { length: 32 }).notNull(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 160 }),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  address: text('address'),
  photoObjectKey: text('photo_object_key'),
  position: text('position').notNull(),
  positionLabel: varchar('position_label', { length: 80 }),
  status: text('status').notNull(),
  joinDate: text('join_date'),
  userId: uuid('user_id'),
  panCiphertext: text('pan_ciphertext'),
  aadhaarCiphertext: text('aadhaar_ciphertext'),
  pharmacistRegistrationNo: varchar('pharmacist_registration_no', { length: 64 }),
  pharmacistRegistrationExpiry: text('pharmacist_registration_expiry'),
  bankAccountHolder: varchar('bank_account_holder', { length: 160 }),
  bankAccountNumberCiphertext: text('bank_account_number_ciphertext'),
  bankIfsc: varchar('bank_ifsc', { length: 20 }),
  bankUpiId: varchar('bank_upi_id', { length: 80 }),
  emergencyName: varchar('emergency_name', { length: 160 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  emergencyRelation: varchar('emergency_relation', { length: 80 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const employeeDocuments = pgTable('employee_documents', {
  documentId: uuid('document_id').primaryKey(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.employeeId),
  type: text('type').notNull(),
  objectKey: text('object_key').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const employeesIdempotency = pgTable(
  'employees_idempotency',
  {
    tenantId: uuid('tenant_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    bodyHash: text('body_hash').notNull(),
    employeeId: uuid('employee_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.idempotencyKey] })],
);
