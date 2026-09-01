import type { Pool } from 'pg';
import { createId } from '@namma-medmate/id-generator';
import type {
  AuthRepository,
  CreateUserInput,
  KioskPinAttemptRecord,
  OtpChallengeRecord,
  PinPurpose,
  PinVerificationRecord,
  SavedDeviceRecord,
  SessionRecord,
  StaffRole,
  UserRecord,
} from './types.ts';

interface UserRow {
  user_id: string;
  tenant_id: string;
  location_id: string;
  login_id: string;
  password_hash: string | null;
  password_enabled: boolean;
  otp_enabled: boolean;
  otp_mobile: string | null;
  pin_hash: string | null;
  failed_attempts: number;
  locked_until: Date | null;
  otp_resend_available_at: Date | null;
  role: StaffRole;
  active: boolean;
  permissions: Record<string, boolean> | null;
  employee_id: string | null;
  temp_password_pending: boolean;
  temp_password_ciphertext: string | null;
  removed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface OtpRow {
  challenge_id: string;
  user_id: string;
  otp_hash: string;
  expires_at: Date;
  attempts: number;
  consumed_at: Date | null;
  created_at: Date;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  tenant_id: string;
  location_id: string;
  token_hash: string;
  created_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
}

interface DeviceRow {
  device_id: string;
  user_id: string;
  tenant_id: string;
  location_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  last_used_at: Date;
  user_agent: string | null;
}

interface KioskRow {
  kiosk_session_id: string;
  user_id: string;
  failed_attempts: number;
  locked_until: Date | null;
}

interface PinRow {
  verification_id: string;
  user_id: string;
  purpose: PinPurpose;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

const USER_SELECT = `select user_id, tenant_id, location_id, login_id, password_hash, password_enabled,
  otp_enabled, otp_mobile, pin_hash, failed_attempts, locked_until, otp_resend_available_at, role,
  active, permissions, employee_id, temp_password_pending, temp_password_ciphertext, removed_at,
  created_at, updated_at from users`;

const USER_RETURNING = `user_id, tenant_id, location_id, login_id, password_hash, password_enabled,
  otp_enabled, otp_mobile, pin_hash, failed_attempts, locked_until, otp_resend_available_at, role,
  active, permissions, employee_id, temp_password_pending, temp_password_ciphertext, removed_at,
  created_at, updated_at`;

const OTP_SELECT = `select challenge_id, user_id, otp_hash, expires_at, attempts, consumed_at, created_at
  from otp_challenges`;

const SESSION_SELECT = `select session_id, user_id, tenant_id, location_id, token_hash, created_at,
  last_seen_at, revoked_at from sessions`;

const DEVICE_SELECT = `select device_id, user_id, tenant_id, location_id, token_hash, expires_at,
  created_at, last_used_at, user_agent from saved_devices`;

function mapUser(row: UserRow): UserRecord {
  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    loginId: row.login_id,
    passwordHash: row.password_hash,
    passwordEnabled: row.password_enabled,
    otpEnabled: row.otp_enabled,
    otpMobile: row.otp_mobile,
    pinHash: row.pin_hash,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    otpResendAvailableAt: row.otp_resend_available_at,
    role: row.role,
    active: row.active,
    permissions: row.permissions ?? {},
    employeeId: row.employee_id,
    tempPasswordPending: row.temp_password_pending,
    tempPasswordCiphertext: row.temp_password_ciphertext,
    removedAt: row.removed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOtp(row: OtpRow): OtpChallengeRecord {
  return {
    challengeId: row.challenge_id,
    userId: row.user_id,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
  };
}

function mapDevice(row: DeviceRow): SavedDeviceRecord {
  return {
    deviceId: row.device_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    userAgent: row.user_agent,
  };
}

function mapKiosk(row: KioskRow): KioskPinAttemptRecord {
  return {
    kioskSessionId: row.kiosk_session_id,
    userId: row.user_id,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
  };
}

function mapPin(row: PinRow): PinVerificationRecord {
  return {
    verificationId: row.verification_id,
    userId: row.user_id,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

function first<T>(result: { rows: T[] }): T | undefined {
  return result.rows[0];
}

export function createSqlAuthRepository(pool: Pool): AuthRepository {
  return {
    async createUser(input: CreateUserInput): Promise<UserRecord> {
      const userId = input.userId ?? createId();
      const result = await pool.query<UserRow>(
        `insert into users (user_id, tenant_id, location_id, login_id, password_hash, password_enabled,
          otp_enabled, otp_mobile, pin_hash, failed_attempts, role, active, permissions, employee_id,
          temp_password_pending, temp_password_ciphertext)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12::jsonb,$13,$14,$15)
         returning ${USER_RETURNING}`,
        [
          userId,
          input.tenantId,
          input.locationId,
          input.loginId,
          input.passwordHash ?? null,
          input.passwordEnabled,
          input.otpEnabled,
          input.otpMobile ?? null,
          input.pinHash ?? null,
          input.role,
          input.active ?? true,
          JSON.stringify(input.permissions ?? {}),
          input.employeeId ?? null,
          input.tempPasswordPending ?? false,
          input.tempPasswordCiphertext ?? null,
        ],
      );
      const row = first(result);
      if (!row) {
        throw new Error('User insert did not persist');
      }
      return mapUser(row);
    },

    async findUserByLoginId(loginId) {
      const result = await pool.query<UserRow>(
        `${USER_SELECT} where lower(login_id) = lower($1) and removed_at is null`,
        [loginId],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async findUserById(userId) {
      const result = await pool.query<UserRow>(`${USER_SELECT} where user_id = $1`, [userId]);
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async updateUserLock(userId, failedAttempts, lockedUntil) {
      const result = await pool.query<UserRow>(
        `update users set failed_attempts = $2, locked_until = $3, updated_at = now()
         where user_id = $1
         returning ${USER_RETURNING}`,
        [userId, failedAttempts, lockedUntil],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async updateOtpResendAvailableAt(userId, at) {
      const result = await pool.query<UserRow>(
        `update users set otp_resend_available_at = $2, updated_at = now()
         where user_id = $1
         returning ${USER_RETURNING}`,
        [userId, at],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async resetUserLock(userId) {
      const result = await pool.query<UserRow>(
        `update users set failed_attempts = 0, locked_until = null, updated_at = now()
         where user_id = $1
         returning ${USER_RETURNING}`,
        [userId],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async listUsers(input) {
      const filters = ['tenant_id = $1', 'location_id = $2', 'removed_at is null'];
      const params: unknown[] = [input.tenantId, input.locationId];
      if (input.active !== undefined) {
        params.push(input.active);
        filters.push(`active = $${params.length}`);
      }
      if (input.role !== undefined) {
        params.push(input.role);
        filters.push(`role = $${params.length}`);
      }
      const where = filters.join(' and ');
      const count = await pool.query<{ total: string }>(
        `select count(*)::text as total from users where ${where}`,
        params,
      );
      const pageSize = Math.max(1, input.pageSize);
      const offset = (Math.max(1, input.page) - 1) * pageSize;
      params.push(pageSize, offset);
      const result = await pool.query<UserRow>(
        `${USER_SELECT} where ${where} order by created_at asc limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return {
        items: result.rows.map((row) => mapUser(row)),
        total: Number(count.rows[0]?.total ?? 0),
      };
    },

    async countActiveUsers(tenantId, locationId) {
      const result = await pool.query<{ total: string }>(
        `select count(*)::text as total from users
         where tenant_id = $1 and location_id = $2 and active = true and removed_at is null`,
        [tenantId, locationId],
      );
      return Number(result.rows[0]?.total ?? 0);
    },

    async findLiveOwner(tenantId, locationId) {
      const result = await pool.query<UserRow>(
        `${USER_SELECT} where tenant_id = $1 and location_id = $2 and role = 'owner' and removed_at is null`,
        [tenantId, locationId],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async findUserByEmployeeId(tenantId, locationId, employeeId) {
      const result = await pool.query<UserRow>(
        `${USER_SELECT} where tenant_id = $1 and location_id = $2 and employee_id = $3 and removed_at is null`,
        [tenantId, locationId, employeeId],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async updateUserProfile(userId, patch) {
      const result = await pool.query<UserRow>(
        `update users set
           login_id = coalesce($2, login_id),
           role = coalesce($3, role),
           employee_id = case when $4::boolean then $5 else employee_id end,
           otp_mobile = case when $6::boolean then $7 else otp_mobile end,
           active = coalesce($8, active),
           updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [
          userId,
          patch.loginId ?? null,
          patch.role ?? null,
          patch.employeeId !== undefined,
          patch.employeeId ?? null,
          patch.otpMobile !== undefined,
          patch.otpMobile ?? null,
          patch.active ?? null,
        ],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async setPermissions(userId, permissions) {
      const result = await pool.query<UserRow>(
        `update users set permissions = $2::jsonb, updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [userId, JSON.stringify(permissions)],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async setMethods(userId, input) {
      const result = await pool.query<UserRow>(
        `update users set password_enabled = $2, otp_enabled = $3, otp_mobile = $4, updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [userId, input.passwordEnabled, input.otpEnabled, input.otpMobile],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async setPasswordCredentials(userId, input) {
      const result = await pool.query<UserRow>(
        `update users set password_hash = $2, temp_password_ciphertext = $3,
           temp_password_pending = $4, updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [userId, input.passwordHash, input.tempPasswordCiphertext, input.tempPasswordPending],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async consumeTempPassword(userId) {
      const result = await pool.query<UserRow>(
        `update users set temp_password_pending = false, temp_password_ciphertext = null, updated_at = now()
         where user_id = $1
         returning ${USER_RETURNING}`,
        [userId],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async setPinHash(userId, pinHash) {
      const result = await pool.query<UserRow>(
        `update users set pin_hash = $2, updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [userId, pinHash],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async softDeleteUser(userId, removedAt) {
      const result = await pool.query<UserRow>(
        `update users set removed_at = $2, employee_id = null, active = false, updated_at = now()
         where user_id = $1 and removed_at is null
         returning ${USER_RETURNING}`,
        [userId, removedAt],
      );
      const row = first(result);
      return row ? mapUser(row) : undefined;
    },

    async revokeSavedDevice(deviceId) {
      const result = await pool.query(`delete from saved_devices where device_id = $1`, [deviceId]);
      return (result.rowCount ?? 0) > 0;
    },

    async revokeSessionsForUser(userId, revokedAt) {
      const result = await pool.query(
        `update sessions set revoked_at = $2 where user_id = $1 and revoked_at is null`,
        [userId, revokedAt],
      );
      return result.rowCount ?? 0;
    },

    async getIdempotency(tenantId, key) {
      const result = await pool.query<{
        tenant_id: string;
        idempotency_key: string;
        body_hash: string;
        user_id: string;
      }>(
        `select tenant_id, idempotency_key, body_hash, user_id from manage_users_idempotency
         where tenant_id = $1 and idempotency_key = $2`,
        [tenantId, key],
      );
      const row = first(result);
      return row
        ? {
            tenantId: row.tenant_id,
            idempotencyKey: row.idempotency_key,
            bodyHash: row.body_hash,
            userId: row.user_id,
          }
        : undefined;
    },

    async putIdempotency(record) {
      await pool.query(
        `insert into manage_users_idempotency (tenant_id, idempotency_key, body_hash, user_id)
         values ($1,$2,$3,$4)
         on conflict (tenant_id, idempotency_key) do nothing`,
        [record.tenantId, record.idempotencyKey, record.bodyHash, record.userId],
      );
    },

    async createOtpChallenge(input) {
      const challengeId = createId();
      const result = await pool.query<OtpRow>(
        `insert into otp_challenges (challenge_id, user_id, otp_hash, expires_at, attempts)
         values ($1,$2,$3,$4,0)
         returning challenge_id, user_id, otp_hash, expires_at, attempts, consumed_at, created_at`,
        [challengeId, input.userId, input.otpHash, input.expiresAt],
      );
      const row = first(result);
      if (!row) {
        throw new Error('OTP challenge insert did not persist');
      }
      return mapOtp(row);
    },

    async findOtpChallenge(challengeId) {
      const result = await pool.query<OtpRow>(`${OTP_SELECT} where challenge_id = $1`, [
        challengeId,
      ]);
      const row = first(result);
      return row ? mapOtp(row) : undefined;
    },

    async incrementOtpAttempts(challengeId) {
      const result = await pool.query<OtpRow>(
        `update otp_challenges set attempts = attempts + 1 where challenge_id = $1
         returning challenge_id, user_id, otp_hash, expires_at, attempts, consumed_at, created_at`,
        [challengeId],
      );
      const row = first(result);
      return row ? mapOtp(row) : undefined;
    },

    async consumeOtpChallenge(challengeId, consumedAt) {
      const result = await pool.query(
        `update otp_challenges set consumed_at = $2
         where challenge_id = $1 and consumed_at is null`,
        [challengeId, consumedAt],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async createSession(input) {
      const sessionId = createId();
      const result = await pool.query<SessionRow>(
        `insert into sessions (session_id, user_id, tenant_id, location_id, token_hash)
         values ($1,$2,$3,$4,$5)
         returning session_id, user_id, tenant_id, location_id, token_hash, created_at,
          last_seen_at, revoked_at`,
        [sessionId, input.userId, input.tenantId, input.locationId, input.tokenHash],
      );
      const row = first(result);
      if (!row) {
        throw new Error('Session insert did not persist');
      }
      return mapSession(row);
    },

    async findSessionByTokenHash(tokenHash) {
      const result = await pool.query<SessionRow>(`${SESSION_SELECT} where token_hash = $1`, [
        tokenHash,
      ]);
      const row = first(result);
      return row ? mapSession(row) : undefined;
    },

    async touchSession(sessionId, lastSeenAt) {
      await pool.query(`update sessions set last_seen_at = $2 where session_id = $1`, [
        sessionId,
        lastSeenAt,
      ]);
    },

    async revokeSession(sessionId, revokedAt) {
      await pool.query(`update sessions set revoked_at = $2 where session_id = $1`, [
        sessionId,
        revokedAt,
      ]);
    },

    async createSavedDevice(input) {
      const deviceId = createId();
      const result = await pool.query<DeviceRow>(
        `insert into saved_devices (device_id, user_id, tenant_id, location_id, token_hash, expires_at, user_agent)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning device_id, user_id, tenant_id, location_id, token_hash, expires_at, created_at,
          last_used_at, user_agent`,
        [
          deviceId,
          input.userId,
          input.tenantId,
          input.locationId,
          input.tokenHash,
          input.expiresAt,
          input.userAgent ?? null,
        ],
      );
      const row = first(result);
      if (!row) {
        throw new Error('Saved device insert did not persist');
      }
      return mapDevice(row);
    },

    async findSavedDeviceByTokenHash(tokenHash) {
      const result = await pool.query<DeviceRow>(`${DEVICE_SELECT} where token_hash = $1`, [
        tokenHash,
      ]);
      const row = first(result);
      return row ? mapDevice(row) : undefined;
    },

    async listSavedDevices(userId) {
      const result = await pool.query<DeviceRow>(
        `${DEVICE_SELECT} where user_id = $1 order by created_at asc`,
        [userId],
      );
      return result.rows.map((row) => mapDevice(row));
    },

    async revokeAllSavedDevices(userId) {
      const result = await pool.query(`delete from saved_devices where user_id = $1`, [userId]);
      return result.rowCount ?? 0;
    },

    async touchSavedDevice(deviceId, lastUsedAt) {
      await pool.query(`update saved_devices set last_used_at = $2 where device_id = $1`, [
        deviceId,
        lastUsedAt,
      ]);
    },

    async getKioskPinAttempt(kioskSessionId, userId) {
      const result = await pool.query<KioskRow>(
        `select kiosk_session_id, user_id, failed_attempts, locked_until
         from kiosk_pin_attempts where kiosk_session_id = $1 and user_id = $2`,
        [kioskSessionId, userId],
      );
      const row = first(result);
      return row ? mapKiosk(row) : undefined;
    },

    async upsertKioskPinAttempt(input) {
      const result = await pool.query<KioskRow>(
        `insert into kiosk_pin_attempts (kiosk_session_id, user_id, failed_attempts, locked_until)
         values ($1,$2,$3,$4)
         on conflict (kiosk_session_id, user_id)
         do update set failed_attempts = excluded.failed_attempts, locked_until = excluded.locked_until
         returning kiosk_session_id, user_id, failed_attempts, locked_until`,
        [input.kioskSessionId, input.userId, input.failedAttempts, input.lockedUntil],
      );
      const row = first(result);
      if (!row) {
        throw new Error('Kiosk pin attempt upsert did not persist');
      }
      return mapKiosk(row);
    },

    async createPinVerification(input) {
      const verificationId = createId();
      const result = await pool.query<PinRow>(
        `insert into pin_verifications (verification_id, user_id, purpose, expires_at)
         values ($1,$2,$3,$4)
         returning verification_id, user_id, purpose, expires_at, consumed_at, created_at`,
        [verificationId, input.userId, input.purpose, input.expiresAt],
      );
      const row = first(result);
      if (!row) {
        throw new Error('Pin verification insert did not persist');
      }
      return mapPin(row);
    },

    async findPinVerification(verificationId) {
      const result = await pool.query<PinRow>(
        `select verification_id, user_id, purpose, expires_at, consumed_at, created_at
         from pin_verifications where verification_id = $1`,
        [verificationId],
      );
      const row = first(result);
      return row ? mapPin(row) : undefined;
    },

    async consumePinVerification(verificationId, consumedAt) {
      const result = await pool.query(
        `update pin_verifications set consumed_at = $2
         where verification_id = $1 and consumed_at is null`,
        [verificationId, consumedAt],
      );
      return (result.rowCount ?? 0) > 0;
    },
  };
}
