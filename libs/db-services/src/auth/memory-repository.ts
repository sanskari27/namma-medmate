import { createId } from '@namma-medmate/id-generator';
import {
  cloneKioskPinAttempt,
  cloneOtpChallenge,
  clonePinVerification,
  cloneSavedDevice,
  cloneSession,
  cloneUser,
} from './clone.ts';
import type {
  AuthRepository,
  CreateUserInput,
  KioskPinAttemptRecord,
  OtpChallengeRecord,
  PinVerificationRecord,
  SavedDeviceRecord,
  SessionRecord,
  UserRecord,
} from './types.ts';

export function createMemoryAuthRepository(now: () => Date = () => new Date()): AuthRepository {
  const users = new Map<string, UserRecord>();
  const usersByLogin = new Map<string, string>();
  const otpChallenges = new Map<string, OtpChallengeRecord>();
  const sessions = new Map<string, SessionRecord>();
  const sessionsByHash = new Map<string, string>();
  const devices = new Map<string, SavedDeviceRecord>();
  const devicesByHash = new Map<string, string>();
  const kioskAttempts = new Map<string, KioskPinAttemptRecord>();
  const pinVerifications = new Map<string, PinVerificationRecord>();

  function kioskKey(kioskSessionId: string, userId: string): string {
    return `${kioskSessionId}:${userId}`;
  }

  return {
    async createUser(input: CreateUserInput): Promise<UserRecord> {
      const createdAt = now();
      const userId = input.userId ?? createId();
      const record: UserRecord = {
        userId,
        tenantId: input.tenantId,
        locationId: input.locationId,
        loginId: input.loginId,
        passwordHash: input.passwordHash ?? null,
        passwordEnabled: input.passwordEnabled,
        otpEnabled: input.otpEnabled,
        otpMobile: input.otpMobile ?? null,
        pinHash: input.pinHash ?? null,
        failedAttempts: 0,
        lockedUntil: null,
        otpResendAvailableAt: null,
        role: input.role,
        active: input.active ?? true,
        createdAt,
        updatedAt: createdAt,
      };
      users.set(userId, record);
      usersByLogin.set(input.loginId, userId);
      return cloneUser(record);
    },

    async findUserByLoginId(loginId: string): Promise<UserRecord | undefined> {
      const userId = usersByLogin.get(loginId);
      const row = userId ? users.get(userId) : undefined;
      return row ? cloneUser(row) : undefined;
    },

    async findUserById(userId: string): Promise<UserRecord | undefined> {
      const row = users.get(userId);
      return row ? cloneUser(row) : undefined;
    },

    async updateUserLock(userId, failedAttempts, lockedUntil) {
      const row = users.get(userId);
      if (!row) {
        return undefined;
      }
      row.failedAttempts = failedAttempts;
      row.lockedUntil = lockedUntil;
      row.updatedAt = now();
      return cloneUser(row);
    },

    async updateOtpResendAvailableAt(userId, at) {
      const row = users.get(userId);
      if (!row) {
        return undefined;
      }
      row.otpResendAvailableAt = at;
      row.updatedAt = now();
      return cloneUser(row);
    },

    async resetUserLock(userId) {
      const row = users.get(userId);
      if (!row) {
        return undefined;
      }
      row.failedAttempts = 0;
      row.lockedUntil = null;
      row.updatedAt = now();
      return cloneUser(row);
    },

    async createOtpChallenge(input) {
      const createdAt = now();
      const record: OtpChallengeRecord = {
        challengeId: createId(),
        userId: input.userId,
        otpHash: input.otpHash,
        expiresAt: input.expiresAt,
        attempts: 0,
        consumedAt: null,
        createdAt,
      };
      otpChallenges.set(record.challengeId, record);
      return cloneOtpChallenge(record);
    },

    async findOtpChallenge(challengeId) {
      const row = otpChallenges.get(challengeId);
      return row ? cloneOtpChallenge(row) : undefined;
    },

    async incrementOtpAttempts(challengeId) {
      const row = otpChallenges.get(challengeId);
      if (!row) {
        return undefined;
      }
      row.attempts += 1;
      return cloneOtpChallenge(row);
    },

    async consumeOtpChallenge(challengeId, consumedAt) {
      const row = otpChallenges.get(challengeId);
      if (!row || row.consumedAt) {
        return false;
      }
      row.consumedAt = consumedAt;
      return true;
    },

    async createSession(input) {
      const createdAt = now();
      const record: SessionRecord = {
        sessionId: createId(),
        userId: input.userId,
        tenantId: input.tenantId,
        locationId: input.locationId,
        tokenHash: input.tokenHash,
        createdAt,
        lastSeenAt: createdAt,
        revokedAt: null,
      };
      sessions.set(record.sessionId, record);
      sessionsByHash.set(record.tokenHash, record.sessionId);
      return cloneSession(record);
    },

    async findSessionByTokenHash(tokenHash) {
      const sessionId = sessionsByHash.get(tokenHash);
      const row = sessionId ? sessions.get(sessionId) : undefined;
      return row ? cloneSession(row) : undefined;
    },

    async touchSession(sessionId, lastSeenAt) {
      const row = sessions.get(sessionId);
      if (row) {
        row.lastSeenAt = lastSeenAt;
      }
    },

    async revokeSession(sessionId, revokedAt) {
      const row = sessions.get(sessionId);
      if (row) {
        row.revokedAt = revokedAt;
      }
    },

    async createSavedDevice(input) {
      const createdAt = now();
      const record: SavedDeviceRecord = {
        deviceId: createId(),
        userId: input.userId,
        tenantId: input.tenantId,
        locationId: input.locationId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt,
        lastUsedAt: createdAt,
        userAgent: input.userAgent ?? null,
      };
      devices.set(record.deviceId, record);
      devicesByHash.set(record.tokenHash, record.deviceId);
      return cloneSavedDevice(record);
    },

    async findSavedDeviceByTokenHash(tokenHash) {
      const deviceId = devicesByHash.get(tokenHash);
      const row = deviceId ? devices.get(deviceId) : undefined;
      return row ? cloneSavedDevice(row) : undefined;
    },

    async listSavedDevices(userId) {
      return [...devices.values()]
        .filter((row) => row.userId === userId)
        .map((row) => cloneSavedDevice(row));
    },

    async revokeAllSavedDevices(userId) {
      let count = 0;
      for (const [deviceId, row] of devices) {
        if (row.userId === userId) {
          devices.delete(deviceId);
          devicesByHash.delete(row.tokenHash);
          count += 1;
        }
      }
      return count;
    },

    async touchSavedDevice(deviceId, lastUsedAt) {
      const row = devices.get(deviceId);
      if (row) {
        row.lastUsedAt = lastUsedAt;
      }
    },

    async getKioskPinAttempt(kioskSessionId, userId) {
      const row = kioskAttempts.get(kioskKey(kioskSessionId, userId));
      return row ? cloneKioskPinAttempt(row) : undefined;
    },

    async upsertKioskPinAttempt(input) {
      const record: KioskPinAttemptRecord = {
        kioskSessionId: input.kioskSessionId,
        userId: input.userId,
        failedAttempts: input.failedAttempts,
        lockedUntil: input.lockedUntil,
      };
      kioskAttempts.set(kioskKey(input.kioskSessionId, input.userId), record);
      return cloneKioskPinAttempt(record);
    },

    async createPinVerification(input) {
      const createdAt = now();
      const record: PinVerificationRecord = {
        verificationId: createId(),
        userId: input.userId,
        purpose: input.purpose,
        expiresAt: input.expiresAt,
        consumedAt: null,
        createdAt,
      };
      pinVerifications.set(record.verificationId, record);
      return clonePinVerification(record);
    },

    async findPinVerification(verificationId) {
      const row = pinVerifications.get(verificationId);
      return row ? clonePinVerification(row) : undefined;
    },

    async consumePinVerification(verificationId, consumedAt) {
      const row = pinVerifications.get(verificationId);
      if (!row || row.consumedAt) {
        return false;
      }
      row.consumedAt = consumedAt;
      return true;
    },
  };
}
