import type {
  KioskPinAttemptRecord,
  OtpChallengeRecord,
  PinVerificationRecord,
  SavedDeviceRecord,
  SessionRecord,
  UserRecord,
} from './types.ts';

export function cloneUser(row: UserRecord): UserRecord {
  return {
    ...row,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    otpResendAvailableAt: row.otpResendAvailableAt ? new Date(row.otpResendAvailableAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function cloneOtpChallenge(row: OtpChallengeRecord): OtpChallengeRecord {
  return {
    ...row,
    expiresAt: new Date(row.expiresAt),
    consumedAt: row.consumedAt ? new Date(row.consumedAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

export function cloneSession(row: SessionRecord): SessionRecord {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    lastSeenAt: new Date(row.lastSeenAt),
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
  };
}

export function cloneSavedDevice(row: SavedDeviceRecord): SavedDeviceRecord {
  return {
    ...row,
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    lastUsedAt: new Date(row.lastUsedAt),
  };
}

export function cloneKioskPinAttempt(row: KioskPinAttemptRecord): KioskPinAttemptRecord {
  return {
    ...row,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
  };
}

export function clonePinVerification(row: PinVerificationRecord): PinVerificationRecord {
  return {
    ...row,
    expiresAt: new Date(row.expiresAt),
    consumedAt: row.consumedAt ? new Date(row.consumedAt) : null,
    createdAt: new Date(row.createdAt),
  };
}
