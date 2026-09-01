import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { locations, pharmacies } from './pharmacies.ts';

export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => pharmacies.tenantId),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.locationId),
  loginId: varchar('login_id', { length: 64 }).notNull().unique(),
  passwordHash: text('password_hash'),
  passwordEnabled: boolean('password_enabled').notNull(),
  otpEnabled: boolean('otp_enabled').notNull(),
  otpMobile: varchar('otp_mobile', { length: 20 }),
  pinHash: text('pin_hash'),
  failedAttempts: integer('failed_attempts').notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' }),
  otpResendAvailableAt: timestamp('otp_resend_available_at', { withTimezone: true, mode: 'date' }),
  role: text('role').notNull(),
  active: boolean('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const otpChallenges = pgTable('otp_challenges', {
  challengeId: uuid('challenge_id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.userId),
  otpHash: text('otp_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  attempts: integer('attempts').notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const sessions = pgTable('sessions', {
  sessionId: uuid('session_id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.userId),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => pharmacies.tenantId),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.locationId),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
});

export const savedDevices = pgTable('saved_devices', {
  deviceId: uuid('device_id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.userId),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => pharmacies.tenantId),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.locationId),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }).notNull(),
  userAgent: varchar('user_agent', { length: 256 }),
});

export const kioskPinAttempts = pgTable(
  'kiosk_pin_attempts',
  {
    kioskSessionId: varchar('kiosk_session_id', { length: 128 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId),
    failedAttempts: integer('failed_attempts').notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'date' }),
  },
  (table) => [primaryKey({ columns: [table.kioskSessionId, table.userId] })],
);

export const pinVerifications = pgTable('pin_verifications', {
  verificationId: uuid('verification_id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.userId),
  purpose: text('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});
