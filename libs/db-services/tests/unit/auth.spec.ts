import { describe, expect, it, vi } from 'vitest';
import {
  PIN_PURPOSES,
  STAFF_ROLES,
  createMemoryAuthRepository,
  createSqlAuthRepository,
} from '../../src/index.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const NOW = new Date('2026-08-31T16:00:00.000Z');

function userInput(loginId = 'priya.cashier') {
  return {
    tenantId: TENANT,
    locationId: LOCATION,
    loginId,
    passwordEnabled: true,
    otpEnabled: true,
    otpMobile: '+919876543210',
    passwordHash: 'hash',
    pinHash: 'pin-hash',
    role: 'cashier' as const,
  };
}

const userRow = {
  user_id: '11111111-1111-4111-8111-111111111111',
  tenant_id: TENANT,
  location_id: LOCATION,
  login_id: 'priya.cashier',
  password_hash: 'hash',
  password_enabled: true,
  otp_enabled: true,
  otp_mobile: '+919876543210',
  pin_hash: 'pin-hash',
  failed_attempts: 0,
  locked_until: null,
  otp_resend_available_at: null,
  role: 'cashier',
  active: true,
  permissions: {},
  employee_id: null,
  temp_password_pending: false,
  temp_password_ciphertext: null,
  removed_at: null,
  created_at: NOW,
  updated_at: NOW,
};

describe('memory auth repository', () => {
  it('defaults the clock when none is provided', async () => {
    const repo = createMemoryAuthRepository();
    const created = await repo.createUser(userInput('clock.default'));
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('creates users and looks them up by login and id', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const created = await repo.createUser(userInput());
    expect(STAFF_ROLES).toContain(created.role);
    expect(created.loginId).toBe('priya.cashier');
    expect(created.failedAttempts).toBe(0);
    await expect(repo.findUserByLoginId('priya.cashier')).resolves.toMatchObject({
      userId: created.userId,
    });
    await expect(repo.findUserById(created.userId)).resolves.toMatchObject({
      loginId: 'priya.cashier',
    });
    await expect(repo.findUserByLoginId('missing')).resolves.toBeUndefined();
    await expect(repo.findUserById(crypto.randomUUID())).resolves.toBeUndefined();
    const minimal = await repo.createUser({
      userId: '22222222-2222-4222-8222-222222222222',
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'minimal.user',
      passwordEnabled: false,
      otpEnabled: true,
      role: 'pharmacist',
    });
    expect(minimal.passwordHash).toBeNull();
    expect(minimal.otpMobile).toBeNull();
    expect(minimal.pinHash).toBeNull();
    expect(minimal.active).toBe(true);
  });

  it('locks, resets, and updates OTP resend independently of kiosk attempts', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const user = await repo.createUser(userInput());
    const lockedUntil = new Date('2026-08-31T16:15:00.000Z');
    await repo.updateUserLock(user.userId, 5, lockedUntil);
    const locked = await repo.findUserById(user.userId);
    expect(locked?.failedAttempts).toBe(5);
    expect(locked?.lockedUntil).toEqual(lockedUntil);
    await repo.updateOtpResendAvailableAt(user.userId, NOW);
    expect((await repo.findUserById(user.userId))?.otpResendAvailableAt).toEqual(NOW);
    await repo.resetUserLock(user.userId);
    expect((await repo.findUserById(user.userId))?.failedAttempts).toBe(0);
    await expect(repo.updateUserLock('missing', 1, null)).resolves.toBeUndefined();
    await expect(repo.updateOtpResendAvailableAt('missing', NOW)).resolves.toBeUndefined();
    await expect(repo.resetUserLock('missing')).resolves.toBeUndefined();

    const kiosk = await repo.upsertKioskPinAttempt({
      kioskSessionId: 'kiosk-abc',
      userId: user.userId,
      failedAttempts: 5,
      lockedUntil: new Date('2026-08-31T16:10:00.000Z'),
    });
    expect(kiosk.failedAttempts).toBe(5);
    const again = await repo.getKioskPinAttempt('kiosk-abc', user.userId);
    expect(again?.lockedUntil).toEqual(kiosk.lockedUntil);
    await expect(repo.getKioskPinAttempt('other', user.userId)).resolves.toBeUndefined();
    await repo.resetUserLock(user.userId);
    expect((await repo.findUserById(user.userId))?.failedAttempts).toBe(0);
    expect((await repo.getKioskPinAttempt('kiosk-abc', user.userId))?.failedAttempts).toBe(5);
    const cleared = await repo.upsertKioskPinAttempt({
      kioskSessionId: 'kiosk-abc',
      userId: user.userId,
      failedAttempts: 0,
      lockedUntil: null,
    });
    expect(cleared.lockedUntil).toBeNull();
    expect((await repo.getKioskPinAttempt('kiosk-abc', user.userId))?.lockedUntil).toBeNull();
  });

  it('consumes an OTP challenge once and tracks attempts', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const user = await repo.createUser(userInput());
    const challenge = await repo.createOtpChallenge({
      userId: user.userId,
      otpHash: 'otp-hash',
      expiresAt: new Date('2026-08-31T16:10:00.000Z'),
    });
    expect(challenge.attempts).toBe(0);
    const incremented = await repo.incrementOtpAttempts(challenge.challengeId);
    expect(incremented?.attempts).toBe(1);
    await expect(repo.findOtpChallenge(challenge.challengeId)).resolves.toMatchObject({
      attempts: 1,
    });
    await expect(repo.consumeOtpChallenge(challenge.challengeId, NOW)).resolves.toBe(true);
    await expect(repo.findOtpChallenge(challenge.challengeId)).resolves.toMatchObject({
      consumedAt: NOW,
    });
    await expect(repo.consumeOtpChallenge(challenge.challengeId, NOW)).resolves.toBe(false);
    await expect(repo.incrementOtpAttempts('missing')).resolves.toBeUndefined();
    await expect(repo.findOtpChallenge('missing')).resolves.toBeUndefined();
    await expect(repo.consumeOtpChallenge('missing', NOW)).resolves.toBe(false);
  });

  it('issues multiple sessions and revokes only one', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const user = await repo.createUser(userInput());
    const a = await repo.createSession({
      userId: user.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'sess-a',
    });
    const b = await repo.createSession({
      userId: user.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'sess-b',
    });
    expect(a.sessionId).not.toBe(b.sessionId);
    await repo.touchSession(a.sessionId, new Date('2026-08-31T16:05:00.000Z'));
    await repo.revokeSession(a.sessionId, NOW);
    expect((await repo.findSessionByTokenHash('sess-a'))?.revokedAt).toEqual(NOW);
    expect((await repo.findSessionByTokenHash('sess-b'))?.revokedAt).toBeNull();
    await expect(repo.findSessionByTokenHash('missing')).resolves.toBeUndefined();
    await repo.touchSession('missing', NOW);
    await repo.revokeSession('missing', NOW);
  });

  it('remembers devices and revokes all for a user', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const user = await repo.createUser(userInput());
    const device = await repo.createSavedDevice({
      userId: user.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'dev-a',
      expiresAt: new Date('2026-09-30T16:00:00.000Z'),
      userAgent: 'Mozilla',
    });
    await repo.createSavedDevice({
      userId: user.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'dev-b',
      expiresAt: new Date('2026-09-30T16:00:00.000Z'),
    });
    await repo.touchSavedDevice(device.deviceId, NOW);
    expect((await repo.findSavedDeviceByTokenHash('dev-a'))?.userAgent).toBe('Mozilla');
    expect(await repo.listSavedDevices(user.userId)).toHaveLength(2);
    expect(await repo.revokeAllSavedDevices(user.userId)).toBe(2);
    await expect(repo.findSavedDeviceByTokenHash('dev-a')).resolves.toBeUndefined();
    expect(await repo.revokeAllSavedDevices(user.userId)).toBe(0);
    await repo.touchSavedDevice('missing', NOW);
  });

  it('lists, updates, and soft-deletes staff users for manage-users', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const owner = await repo.createUser({
      ...userInput('priya.owner'),
      role: 'owner',
      permissions: { 'manage-users': true },
    });
    const cashier = await repo.createUser({
      ...userInput('ravi.cashier'),
      role: 'cashier',
      employeeId: 'e_01',
    });
    expect(await repo.countActiveUsers(TENANT, LOCATION)).toBe(2);
    expect((await repo.findLiveOwner(TENANT, LOCATION))?.userId).toBe(owner.userId);
    const listed = await repo.listUsers({
      tenantId: TENANT,
      locationId: LOCATION,
      page: 1,
      pageSize: 20,
    });
    expect(listed.total).toBe(2);
    await expect(repo.findUserByEmployeeId(TENANT, LOCATION, 'e_01')).resolves.toMatchObject({
      loginId: 'ravi.cashier',
    });
    await repo.updateUserProfile(cashier.userId, {
      loginId: 'ravi.till',
      role: 'manager',
      active: false,
      employeeId: null,
      otpMobile: '+919111111111',
    });
    expect(await repo.countActiveUsers(TENANT, LOCATION)).toBe(1);
    await expect(repo.findUserByLoginId('ravi.cashier')).resolves.toBeUndefined();
    await expect(repo.findUserByLoginId('RAVI.TILL')).resolves.toMatchObject({
      loginId: 'ravi.till',
    });
    await repo.setPermissions(cashier.userId, { 'pos-billing': true });
    await repo.setMethods(cashier.userId, {
      passwordEnabled: true,
      otpEnabled: false,
      otpMobile: null,
    });
    await repo.setPasswordCredentials(cashier.userId, {
      passwordHash: 'new-hash',
      tempPasswordCiphertext: 'sealed',
      tempPasswordPending: true,
    });
    await repo.consumeTempPassword(cashier.userId);
    await repo.setPinHash(cashier.userId, 'pin');
    await repo.setPinHash(cashier.userId, null);
    const device = await repo.createSavedDevice({
      userId: cashier.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'dev-x',
      expiresAt: NOW,
    });
    await repo.createSession({
      userId: cashier.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'sess-x',
    });
    expect(await repo.revokeSavedDevice(device.deviceId)).toBe(true);
    expect(await repo.revokeSavedDevice('missing')).toBe(false);
    expect(await repo.revokeSessionsForUser(cashier.userId, NOW)).toBe(1);
    await repo.touchSession('missing', NOW);
    await repo.putIdempotency({
      tenantId: TENANT,
      idempotencyKey: 'k1',
      bodyHash: 'h1',
      userId: cashier.userId,
    });
    await expect(repo.getIdempotency(TENANT, 'k1')).resolves.toMatchObject({ bodyHash: 'h1' });
    await expect(repo.getIdempotency(TENANT, 'missing')).resolves.toBeUndefined();
    await repo.softDeleteUser(cashier.userId, NOW);
    await expect(repo.findUserByLoginId('ravi.till')).resolves.toBeUndefined();
    await expect(repo.findUserByEmployeeId(TENANT, LOCATION, 'e_01')).resolves.toBeUndefined();
    await expect(repo.updateUserProfile('missing', { active: false })).resolves.toBeUndefined();
    await expect(repo.setPermissions('missing', {})).resolves.toBeUndefined();
    await expect(
      repo.setMethods('missing', { passwordEnabled: true, otpEnabled: false, otpMobile: null }),
    ).resolves.toBeUndefined();
    await expect(
      repo.setPasswordCredentials('missing', {
        passwordHash: 'x',
        tempPasswordCiphertext: null,
        tempPasswordPending: false,
      }),
    ).resolves.toBeUndefined();
    await expect(repo.consumeTempPassword('missing')).resolves.toBeUndefined();
    await expect(repo.setPinHash('missing', null)).resolves.toBeUndefined();
    await expect(repo.softDeleteUser('missing', NOW)).resolves.toBeUndefined();
    await expect(repo.findLiveOwner(TENANT, 'other')).resolves.toBeUndefined();
    const cashiers = await repo.listUsers({
      tenantId: TENANT,
      locationId: LOCATION,
      role: 'cashier',
      active: true,
      page: 1,
      pageSize: 10,
    });
    expect(cashiers.total).toBe(0);
  });

  it('creates and consumes pin verifications once', async () => {
    const repo = createMemoryAuthRepository(() => NOW);
    const user = await repo.createUser(userInput());
    expect(PIN_PURPOSES).toContain('credit_limit');
    const verification = await repo.createPinVerification({
      userId: user.userId,
      purpose: 'credit_limit',
      expiresAt: new Date('2026-08-31T16:05:00.000Z'),
    });
    await expect(repo.findPinVerification(verification.verificationId)).resolves.toMatchObject({
      purpose: 'credit_limit',
    });
    await expect(repo.consumePinVerification(verification.verificationId, NOW)).resolves.toBe(true);
    await expect(repo.findPinVerification(verification.verificationId)).resolves.toMatchObject({
      consumedAt: NOW,
    });
    await expect(repo.consumePinVerification(verification.verificationId, NOW)).resolves.toBe(
      false,
    );
    await expect(repo.findPinVerification('missing')).resolves.toBeUndefined();
    await expect(repo.consumePinVerification('missing', NOW)).resolves.toBe(false);
  });

  it('looks up pharmacy sessions for bearer verification', async () => {
    const { createPharmacySessionLookup } = await import('../../src/index.ts');
    const repo = createMemoryAuthRepository(() => NOW);
    const lookup = createPharmacySessionLookup(repo);
    const user = await repo.createUser(userInput('owner.one'));
    await expect(lookup.findByTokenHash('missing')).resolves.toBeNull();
    const session = await repo.createSession({
      userId: user.userId,
      tenantId: TENANT,
      locationId: LOCATION,
      tokenHash: 'sess-hash',
    });
    await expect(lookup.findByTokenHash('sess-hash')).resolves.toMatchObject({
      sessionId: session.sessionId,
      role: 'cashier',
    });
    await repo.revokeSession(session.sessionId, NOW);
    await expect(lookup.findByTokenHash('sess-hash')).resolves.toBeNull();
    const orphan = createPharmacySessionLookup({
      findSessionByTokenHash: async () => ({
        sessionId: 's',
        userId: 'gone',
        tenantId: TENANT,
        locationId: LOCATION,
        tokenHash: 'h',
        createdAt: NOW,
        lastSeenAt: NOW,
        revokedAt: null,
      }),
      findUserById: async () => undefined,
    } as never);
    await expect(orphan.findByTokenHash('h')).resolves.toBeNull();
  });
});

function mockPool(query: ReturnType<typeof vi.fn>) {
  return { query };
}

describe('sql auth repository', () => {
  it('maps user, otp, session, device, kiosk, and pin rows', async () => {
    const otpRow = {
      challenge_id: 'ch-1',
      user_id: userRow.user_id,
      otp_hash: 'otp-hash',
      expires_at: NOW,
      attempts: 1,
      consumed_at: null,
      created_at: NOW,
    };
    const sessionRow = {
      session_id: 'sess-1',
      user_id: userRow.user_id,
      tenant_id: TENANT,
      location_id: LOCATION,
      token_hash: 'sess-hash',
      created_at: NOW,
      last_seen_at: NOW,
      revoked_at: null,
    };
    const deviceRow = {
      device_id: 'dev-1',
      user_id: userRow.user_id,
      tenant_id: TENANT,
      location_id: LOCATION,
      token_hash: 'dev-hash',
      expires_at: NOW,
      created_at: NOW,
      last_used_at: NOW,
      user_agent: 'Mozilla',
    };
    const kioskRow = {
      kiosk_session_id: 'kiosk-abc',
      user_id: userRow.user_id,
      failed_attempts: 2,
      locked_until: NOW,
    };
    const pinRow = {
      verification_id: 'pinver-1',
      user_id: userRow.user_id,
      purpose: 'fefo_override',
      expires_at: NOW,
      consumed_at: null,
      created_at: NOW,
    };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('count(*)')) {
        return { rows: [{ total: '2' }] };
      }
      if (sql.includes('manage_users_idempotency')) {
        return {
          rows: [
            {
              tenant_id: TENANT,
              idempotency_key: 'k1',
              body_hash: 'h1',
              user_id: userRow.user_id,
            },
          ],
        };
      }
      if (
        sql.startsWith('insert into users') ||
        sql.includes('from users') ||
        sql.includes('update users')
      ) {
        return { rows: [userRow] };
      }
      if (sql.includes('otp_challenges')) {
        if (sql.startsWith('update otp_challenges set consumed_at')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [otpRow] };
      }
      if (sql.includes('from sessions') || sql.startsWith('insert into sessions')) {
        return { rows: [sessionRow] };
      }
      if (sql.startsWith('update sessions')) {
        return { rows: [], rowCount: sql.includes('user_id') ? 2 : 1 };
      }
      if (sql.includes('saved_devices')) {
        if (sql.startsWith('delete')) {
          return { rows: [], rowCount: 2 };
        }
        if (sql.includes('where user_id')) {
          return { rows: [deviceRow, { ...deviceRow, device_id: 'dev-2' }] };
        }
        if (sql.startsWith('update saved_devices')) {
          return { rows: [] };
        }
        return { rows: [deviceRow] };
      }
      if (sql.includes('kiosk_pin_attempts')) {
        return { rows: [kioskRow] };
      }
      if (sql.includes('pin_verifications')) {
        if (sql.startsWith('update pin_verifications')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [pinRow] };
      }
      return { rows: [] };
    });
    const repo = createSqlAuthRepository(mockPool(query) as never);
    await expect(repo.createUser(userInput())).resolves.toMatchObject({ loginId: 'priya.cashier' });
    await expect(
      repo.createUser({
        tenantId: TENANT,
        locationId: LOCATION,
        loginId: 'bare',
        passwordEnabled: true,
        otpEnabled: false,
        role: 'cashier',
      }),
    ).resolves.toMatchObject({ loginId: 'priya.cashier' });
    await expect(repo.findUserByLoginId('priya.cashier')).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.findUserById(userRow.user_id)).resolves.toMatchObject({ role: 'cashier' });
    await expect(repo.updateUserLock(userRow.user_id, 1, NOW)).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.updateOtpResendAvailableAt(userRow.user_id, NOW)).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.resetUserLock(userRow.user_id)).resolves.toMatchObject({ failedAttempts: 0 });
    await expect(
      repo.createOtpChallenge({ userId: userRow.user_id, otpHash: 'x', expiresAt: NOW }),
    ).resolves.toMatchObject({ challengeId: 'ch-1' });
    await expect(repo.findOtpChallenge('ch-1')).resolves.toMatchObject({ attempts: 1 });
    await expect(repo.incrementOtpAttempts('ch-1')).resolves.toMatchObject({ attempts: 1 });
    await expect(repo.consumeOtpChallenge('ch-1', NOW)).resolves.toBe(true);
    await expect(
      repo.createSession({
        userId: userRow.user_id,
        tenantId: TENANT,
        locationId: LOCATION,
        tokenHash: 'sess-hash',
      }),
    ).resolves.toMatchObject({ sessionId: 'sess-1' });
    await expect(repo.findSessionByTokenHash('sess-hash')).resolves.toMatchObject({
      tokenHash: 'sess-hash',
    });
    await repo.touchSession('sess-1', NOW);
    await repo.revokeSession('sess-1', NOW);
    await expect(
      repo.createSavedDevice({
        userId: userRow.user_id,
        tenantId: TENANT,
        locationId: LOCATION,
        tokenHash: 'dev-hash',
        expiresAt: NOW,
        userAgent: 'Mozilla',
      }),
    ).resolves.toMatchObject({ deviceId: 'dev-1' });
    await expect(repo.findSavedDeviceByTokenHash('dev-hash')).resolves.toMatchObject({
      userAgent: 'Mozilla',
    });
    await expect(repo.listSavedDevices(userRow.user_id)).resolves.toHaveLength(2);
    await expect(repo.revokeAllSavedDevices(userRow.user_id)).resolves.toBe(2);
    await repo.touchSavedDevice('dev-1', NOW);
    await expect(repo.getKioskPinAttempt('kiosk-abc', userRow.user_id)).resolves.toMatchObject({
      failedAttempts: 2,
    });
    await expect(
      repo.upsertKioskPinAttempt({
        kioskSessionId: 'kiosk-abc',
        userId: userRow.user_id,
        failedAttempts: 2,
        lockedUntil: NOW,
      }),
    ).resolves.toMatchObject({ kioskSessionId: 'kiosk-abc' });
    await expect(
      repo.createPinVerification({
        userId: userRow.user_id,
        purpose: 'fefo_override',
        expiresAt: NOW,
      }),
    ).resolves.toMatchObject({ verificationId: 'pinver-1' });
    await expect(repo.findPinVerification('pinver-1')).resolves.toMatchObject({
      purpose: 'fefo_override',
    });
    await expect(repo.consumePinVerification('pinver-1', NOW)).resolves.toBe(true);
    await expect(
      repo.listUsers({ tenantId: TENANT, locationId: LOCATION, page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({ total: 2 });
    await expect(
      repo.listUsers({
        tenantId: TENANT,
        locationId: LOCATION,
        active: true,
        role: 'cashier',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toMatchObject({ total: 2 });
    await expect(repo.countActiveUsers(TENANT, LOCATION)).resolves.toBe(2);
    await expect(repo.findLiveOwner(TENANT, LOCATION)).resolves.toMatchObject({ role: 'cashier' });
    await expect(repo.findUserByEmployeeId(TENANT, LOCATION, 'e_01')).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(
      repo.updateUserProfile(userRow.user_id, { loginId: 'x', active: false, employeeId: null }),
    ).resolves.toMatchObject({ userId: userRow.user_id });
    await expect(
      repo.updateUserProfile(userRow.user_id, {
        role: 'manager',
        otpMobile: '+919000000000',
        employeeId: 'e_01',
      }),
    ).resolves.toMatchObject({ userId: userRow.user_id });
    await expect(repo.setPermissions(userRow.user_id, { crm: true })).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(
      repo.setMethods(userRow.user_id, {
        passwordEnabled: true,
        otpEnabled: false,
        otpMobile: null,
      }),
    ).resolves.toMatchObject({ userId: userRow.user_id });
    await expect(
      repo.setPasswordCredentials(userRow.user_id, {
        passwordHash: 'h',
        tempPasswordCiphertext: 'c',
        tempPasswordPending: true,
      }),
    ).resolves.toMatchObject({ userId: userRow.user_id });
    await expect(repo.consumeTempPassword(userRow.user_id)).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.setPinHash(userRow.user_id, null)).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.softDeleteUser(userRow.user_id, NOW)).resolves.toMatchObject({
      userId: userRow.user_id,
    });
    await expect(repo.revokeSavedDevice('dev-1')).resolves.toBe(true);
    await expect(repo.revokeSessionsForUser(userRow.user_id, NOW)).resolves.toBe(2);
    await repo.putIdempotency({
      tenantId: TENANT,
      idempotencyKey: 'k1',
      bodyHash: 'h1',
      userId: userRow.user_id,
    });
    await expect(repo.getIdempotency(TENANT, 'k1')).resolves.toMatchObject({ bodyHash: 'h1' });
    await expect(
      createSqlAuthRepository(
        mockPool(vi.fn(async () => ({ rows: [{ ...userRow, permissions: null }] }))) as never,
      ).findUserById(userRow.user_id),
    ).resolves.toMatchObject({ permissions: {} });
  });

  it('returns undefined and throws when SQL writes persist nothing', async () => {
    const empty = createSqlAuthRepository(
      mockPool(vi.fn(async () => ({ rows: [], rowCount: 0 }))) as never,
    );
    await expect(empty.createUser(userInput())).rejects.toThrow('User insert did not persist');
    await expect(empty.findUserByLoginId('x')).resolves.toBeUndefined();
    await expect(empty.findUserById('x')).resolves.toBeUndefined();
    await expect(empty.updateUserLock('x', 1, null)).resolves.toBeUndefined();
    await expect(empty.updateOtpResendAvailableAt('x', NOW)).resolves.toBeUndefined();
    await expect(empty.resetUserLock('x')).resolves.toBeUndefined();
    await expect(
      empty.createOtpChallenge({ userId: 'x', otpHash: 'h', expiresAt: NOW }),
    ).rejects.toThrow('OTP challenge insert did not persist');
    await expect(empty.findOtpChallenge('x')).resolves.toBeUndefined();
    await expect(empty.incrementOtpAttempts('x')).resolves.toBeUndefined();
    await expect(empty.consumeOtpChallenge('x', NOW)).resolves.toBe(false);
    await expect(
      empty.createSession({
        userId: 'x',
        tenantId: TENANT,
        locationId: LOCATION,
        tokenHash: 'h',
      }),
    ).rejects.toThrow('Session insert did not persist');
    await expect(empty.findSessionByTokenHash('x')).resolves.toBeUndefined();
    await empty.touchSession('x', NOW);
    await empty.revokeSession('x', NOW);
    await expect(
      empty.createSavedDevice({
        userId: 'x',
        tenantId: TENANT,
        locationId: LOCATION,
        tokenHash: 'h',
        expiresAt: NOW,
      }),
    ).rejects.toThrow('Saved device insert did not persist');
    await expect(empty.findSavedDeviceByTokenHash('x')).resolves.toBeUndefined();
    await expect(empty.listSavedDevices('x')).resolves.toEqual([]);
    await expect(empty.revokeAllSavedDevices('x')).resolves.toBe(0);
    await empty.touchSavedDevice('x', NOW);
    await expect(empty.getKioskPinAttempt('k', 'u')).resolves.toBeUndefined();
    await expect(
      empty.upsertKioskPinAttempt({
        kioskSessionId: 'k',
        userId: 'u',
        failedAttempts: 1,
        lockedUntil: null,
      }),
    ).rejects.toThrow('Kiosk pin attempt upsert did not persist');
    await expect(
      empty.createPinVerification({ userId: 'u', purpose: 'kiosk_exit', expiresAt: NOW }),
    ).rejects.toThrow('Pin verification insert did not persist');
    await expect(empty.findPinVerification('x')).resolves.toBeUndefined();
    await expect(empty.consumePinVerification('x', NOW)).resolves.toBe(false);
    await expect(
      empty.listUsers({ tenantId: TENANT, locationId: LOCATION, page: 1, pageSize: 20 }),
    ).resolves.toEqual({ items: [], total: 0 });
    await expect(empty.countActiveUsers(TENANT, LOCATION)).resolves.toBe(0);
    await expect(empty.findLiveOwner(TENANT, LOCATION)).resolves.toBeUndefined();
    await expect(empty.findUserByEmployeeId(TENANT, LOCATION, 'e')).resolves.toBeUndefined();
    await expect(empty.updateUserProfile('x', { active: false })).resolves.toBeUndefined();
    await expect(empty.setPermissions('x', {})).resolves.toBeUndefined();
    await expect(
      empty.setMethods('x', { passwordEnabled: true, otpEnabled: false, otpMobile: null }),
    ).resolves.toBeUndefined();
    await expect(
      empty.setPasswordCredentials('x', {
        passwordHash: 'h',
        tempPasswordCiphertext: null,
        tempPasswordPending: false,
      }),
    ).resolves.toBeUndefined();
    await expect(empty.consumeTempPassword('x')).resolves.toBeUndefined();
    await expect(empty.setPinHash('x', null)).resolves.toBeUndefined();
    await expect(empty.softDeleteUser('x', NOW)).resolves.toBeUndefined();
    await expect(empty.revokeSavedDevice('x')).resolves.toBe(false);
    await expect(empty.revokeSessionsForUser('x', NOW)).resolves.toBe(0);
    await expect(empty.getIdempotency(TENANT, 'k')).resolves.toBeUndefined();
    await empty.putIdempotency({
      tenantId: TENANT,
      idempotencyKey: 'k',
      bodyHash: 'h',
      userId: 'x',
    });
  });

  it('treats a missing rowCount as zero', async () => {
    const repo = createSqlAuthRepository(mockPool(vi.fn(async () => ({ rows: [] }))) as never);
    await expect(repo.consumeOtpChallenge('x', NOW)).resolves.toBe(false);
    await expect(repo.revokeAllSavedDevices('x')).resolves.toBe(0);
    await expect(repo.consumePinVerification('x', NOW)).resolves.toBe(false);
    await expect(repo.revokeSavedDevice('x')).resolves.toBe(false);
    await expect(repo.revokeSessionsForUser('x', NOW)).resolves.toBe(0);
  });
});
