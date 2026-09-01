export const STAFF_ROLES = ['owner', 'manager', 'pharmacist', 'cashier'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PIN_PURPOSES = [
  'kiosk_exit',
  'fefo_override',
  'below_cost',
  'credit_limit',
  'saved_device_unlock',
] as const;
export type PinPurpose = (typeof PIN_PURPOSES)[number];

export interface UserRecord {
  userId: string;
  tenantId: string;
  locationId: string;
  loginId: string;
  passwordHash: string | null;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  otpMobile: string | null;
  pinHash: string | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  otpResendAvailableAt: Date | null;
  role: StaffRole;
  active: boolean;
  permissions: Record<string, boolean>;
  employeeId: string | null;
  tempPasswordPending: boolean;
  tempPasswordCiphertext: string | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  userId?: string;
  tenantId: string;
  locationId: string;
  loginId: string;
  passwordHash?: string | null;
  passwordEnabled: boolean;
  otpEnabled: boolean;
  otpMobile?: string | null;
  pinHash?: string | null;
  role: StaffRole;
  active?: boolean;
  permissions?: Record<string, boolean>;
  employeeId?: string | null;
  tempPasswordPending?: boolean;
  tempPasswordCiphertext?: string | null;
}

export interface UpdateUserProfileInput {
  loginId?: string;
  role?: StaffRole;
  employeeId?: string | null;
  otpMobile?: string | null;
  active?: boolean;
}

export interface ListUsersInput {
  tenantId: string;
  locationId: string;
  active?: boolean;
  role?: StaffRole;
  page: number;
  pageSize: number;
}

export interface ListUsersResult {
  items: UserRecord[];
  total: number;
}

export interface IdempotencyRecord {
  tenantId: string;
  idempotencyKey: string;
  bodyHash: string;
  userId: string;
}

export interface OtpChallengeRecord {
  challengeId: string;
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  locationId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export interface SavedDeviceRecord {
  deviceId: string;
  userId: string;
  tenantId: string;
  locationId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent: string | null;
}

export interface KioskPinAttemptRecord {
  kioskSessionId: string;
  userId: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface PinVerificationRecord {
  verificationId: string;
  userId: string;
  purpose: PinPurpose;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findUserByLoginId(loginId: string): Promise<UserRecord | undefined>;
  findUserById(userId: string): Promise<UserRecord | undefined>;
  listUsers(input: ListUsersInput): Promise<ListUsersResult>;
  countActiveUsers(tenantId: string, locationId: string): Promise<number>;
  findLiveOwner(tenantId: string, locationId: string): Promise<UserRecord | undefined>;
  findUserByEmployeeId(
    tenantId: string,
    locationId: string,
    employeeId: string,
  ): Promise<UserRecord | undefined>;
  updateUserProfile(userId: string, patch: UpdateUserProfileInput): Promise<UserRecord | undefined>;
  setPermissions(
    userId: string,
    permissions: Record<string, boolean>,
  ): Promise<UserRecord | undefined>;
  setMethods(
    userId: string,
    input: { passwordEnabled: boolean; otpEnabled: boolean; otpMobile: string | null },
  ): Promise<UserRecord | undefined>;
  setPasswordCredentials(
    userId: string,
    input: {
      passwordHash: string;
      tempPasswordCiphertext: string | null;
      tempPasswordPending: boolean;
    },
  ): Promise<UserRecord | undefined>;
  consumeTempPassword(userId: string): Promise<UserRecord | undefined>;
  setPinHash(userId: string, pinHash: string | null): Promise<UserRecord | undefined>;
  softDeleteUser(userId: string, removedAt: Date): Promise<UserRecord | undefined>;
  revokeSavedDevice(deviceId: string): Promise<boolean>;
  revokeSessionsForUser(userId: string, revokedAt: Date): Promise<number>;
  getIdempotency(tenantId: string, key: string): Promise<IdempotencyRecord | undefined>;
  putIdempotency(record: IdempotencyRecord): Promise<void>;
  updateUserLock(
    userId: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<UserRecord | undefined>;
  updateOtpResendAvailableAt(userId: string, at: Date | null): Promise<UserRecord | undefined>;
  resetUserLock(userId: string): Promise<UserRecord | undefined>;
  createOtpChallenge(input: {
    userId: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpChallengeRecord>;
  findOtpChallenge(challengeId: string): Promise<OtpChallengeRecord | undefined>;
  incrementOtpAttempts(challengeId: string): Promise<OtpChallengeRecord | undefined>;
  consumeOtpChallenge(challengeId: string, now: Date): Promise<boolean>;
  createSession(input: {
    userId: string;
    tenantId: string;
    locationId: string;
    tokenHash: string;
  }): Promise<SessionRecord>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | undefined>;
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  createSavedDevice(input: {
    userId: string;
    tenantId: string;
    locationId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
  }): Promise<SavedDeviceRecord>;
  findSavedDeviceByTokenHash(tokenHash: string): Promise<SavedDeviceRecord | undefined>;
  listSavedDevices(userId: string): Promise<SavedDeviceRecord[]>;
  revokeAllSavedDevices(userId: string): Promise<number>;
  touchSavedDevice(deviceId: string, lastUsedAt: Date): Promise<void>;
  getKioskPinAttempt(
    kioskSessionId: string,
    userId: string,
  ): Promise<KioskPinAttemptRecord | undefined>;
  upsertKioskPinAttempt(input: {
    kioskSessionId: string;
    userId: string;
    failedAttempts: number;
    lockedUntil: Date | null;
  }): Promise<KioskPinAttemptRecord>;
  createPinVerification(input: {
    userId: string;
    purpose: PinPurpose;
    expiresAt: Date;
  }): Promise<PinVerificationRecord>;
  findPinVerification(verificationId: string): Promise<PinVerificationRecord | undefined>;
  consumePinVerification(verificationId: string, now: Date): Promise<boolean>;
}
