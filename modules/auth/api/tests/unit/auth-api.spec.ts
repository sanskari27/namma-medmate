import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SESSION_IDLE_MS } from '@namma-medmate/auth-utils';
import { createMemoryAuthRepository, type AuthRepository } from '@namma-medmate/db-services';
import { hashSecret } from '@namma-medmate/encryption-utils';
import { createLogger } from '@namma-medmate/logger';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { loadAuthEnv } from '../../src/config/env.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { createHttpAuthAuditClient } from '../../src/audit/http-client.ts';
import { MemoryWhatsAppClient } from '../../src/whatsapp/client.ts';
import { createHttpWhatsAppClient } from '../../src/whatsapp/http-client.ts';
import { resetLoginRateLimit } from '../../src/login/rate-limit.ts';
import { isPinPurpose, ROLE_LABEL } from '../../src/http/mappers.ts';
import { seedAuthUsers, SEED_PASSWORD, SEED_PIN } from '../../src/local-seed.ts';
import { createVerifyPinController } from '../../src/controllers/verify-pin.controller.ts';
import {
  OTP_TTL_MS,
  clientIp,
  createOpaqueToken,
  createRandomOtp,
  readBody,
  recordSharedFailure,
  requirePharmacySession,
} from '../../src/login/session.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

const env = () => loadAuthEnv({ LOG_LEVEL: 'error' });

describe('auth env', () => {
  it('defaults port and memory persistence', () => {
    const loaded = loadAuthEnv({});
    expect(loaded.AUTH_API_PORT).toBe(3001);
    expect(loaded.AUTH_PERSISTENCE).toBe('memory');
  });

  it('accepts postgres, urls, and a fixed OTP', () => {
    const loaded = loadAuthEnv({
      AUTH_PERSISTENCE: 'postgres',
      DATABASE_URL: 'postgres://namma:namma@127.0.0.1:5432/namma',
      WHATSAPP_API_BASE_URL: 'http://localhost:3003',
      WHATSAPP_SERVICE_TOKEN: 'svc',
      AUDIT_API_BASE_URL: 'http://localhost:3004',
      AUDIT_SERVICE_TOKEN: 'audit',
      AUTH_FIXED_OTP: '4821',
      AUTH_API_PORT: '4011',
    });
    expect(loaded.AUTH_FIXED_OTP).toBe('4821');
    expect(loaded.AUTH_API_PORT).toBe(4011);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/auth/api/src/app.ts',
        '/tmp',
      ),
    ).toMatch(/contract\/swagger\.yaml$/);
  });

  it('falls back to cwd copies and ignores an invalid module url', () => {
    expect(
      resolveApiSpecPath((path) => path === '/var/task/swagger.yaml', 'not-a-url', '/var/task'),
    ).toBe('/var/task/swagger.yaml');
    expect(resolveApiSpecPath(() => false, undefined, '/tmp')).toBeUndefined();
  });
});

describe('mappers', () => {
  it('accepts PIN purposes and maps Owner labels', () => {
    expect(isPinPurpose('kiosk_exit')).toBe(true);
    expect(isPinPurpose('nope')).toBe(false);
    expect(ROLE_LABEL.owner).toBe('Owner');
  });
});

describe('auth-api chemist login', () => {
  let passwordHash = '';
  let pinHash = '';

  beforeAll(async () => {
    passwordHash = await hashSecret(SEED_PASSWORD);
    pinHash = await hashSecret(SEED_PIN);
  });

  afterEach(() => {
    resetLoginRateLimit();
  });

  function clock(start: Date) {
    let current = start;
    return {
      now: () => current,
      set: (next: Date) => {
        current = next;
      },
    };
  }

  async function seed(auth = createMemoryAuthRepository()) {
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'priya.cashier',
      passwordHash,
      passwordEnabled: true,
      otpEnabled: true,
      otpMobile: '+919876543210',
      pinHash,
      role: 'cashier',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'priya.owner',
      passwordHash,
      passwordEnabled: true,
      otpEnabled: true,
      otpMobile: '+919876543211',
      pinHash,
      role: 'owner',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'otp.only',
      passwordEnabled: false,
      otpEnabled: true,
      otpMobile: '+919876543212',
      role: 'pharmacist',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'password.only',
      passwordHash,
      passwordEnabled: true,
      otpEnabled: false,
      role: 'manager',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'inactive.user',
      passwordHash,
      passwordEnabled: true,
      otpEnabled: false,
      role: 'cashier',
      active: false,
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'no.methods',
      passwordEnabled: false,
      otpEnabled: false,
      role: 'cashier',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'no.pin',
      passwordHash,
      passwordEnabled: true,
      otpEnabled: false,
      role: 'cashier',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'otp.nomobile',
      passwordEnabled: false,
      otpEnabled: true,
      role: 'pharmacist',
    });
    await auth.createUser({
      tenantId: TENANT,
      locationId: LOCATION,
      loginId: 'password.nohash',
      passwordEnabled: true,
      otpEnabled: false,
      role: 'cashier',
    });
    return auth;
  }

  async function login(
    app: ReturnType<typeof createApp>,
    loginId = 'priya.cashier',
    remember = false,
  ) {
    const response = await request(app)
      .post('/auth/login/password')
      .send({ login_id: loginId, password: SEED_PASSWORD, remember_device: remember });
    expect(response.status).toBe(200);
    return response.body.data as {
      session_token: string;
      session_id: string;
      device_token: string | null;
      role: string;
    };
  }

  it('issues a session with tenant and location on password login', async () => {
    const app = createApp(env(), { auth: await seed() });
    const data = await login(app);
    expect(data.session_token.startsWith('nm_sess_')).toBe(true);
    const session = await request(app)
      .get('/auth/session')
      .set('authorization', `Bearer ${data.session_token}`);
    expect(session.status).toBe(200);
    expect(session.body.data).toMatchObject({
      tenant_id: TENANT,
      location_id: LOCATION,
      role: 'Cashier',
      permissions_owner_frozen: false,
    });
  });

  it('freezes Owner claims and allows two concurrent sessions', async () => {
    const app = createApp(env(), { auth: await seed() });
    const a = await login(app, 'priya.owner');
    const b = await login(app, 'priya.owner');
    expect(a.session_id).not.toBe(b.session_id);
    const owner = await request(app)
      .get('/auth/session')
      .set('authorization', `Bearer ${a.session_token}`);
    expect(owner.body.data.role).toBe('Owner');
    expect(owner.body.data.permissions_owner_frozen).toBe(true);
    await request(app).post('/auth/logout').set('authorization', `Bearer ${a.session_token}`);
    const gone = await request(app)
      .get('/auth/session')
      .set('authorization', `Bearer ${a.session_token}`);
    expect(gone.status).toBe(401);
    expect(gone.body.error.code).toBe('UNAUTHENTICATED');
    const still = await request(app)
      .get('/auth/session')
      .set('authorization', `Bearer ${b.session_token}`);
    expect(still.status).toBe(200);
  });

  it('rejects unknown, inactive, method-disabled, and no-method users', async () => {
    const app = createApp(env(), { auth: await seed() });
    const unknown = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'nobody', password: 'x' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');
    const inactive = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'inactive.user', password: SEED_PASSWORD });
    expect(inactive.status).toBe(403);
    expect(inactive.body.error.code).toBe('USER_INACTIVE');
    const otpOff = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'password.only' });
    expect(otpOff.status).toBe(403);
    expect(otpOff.body.error.code).toBe('METHOD_DISABLED');
    const passwordOff = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'otp.only', password: SEED_PASSWORD });
    expect(passwordOff.status).toBe(403);
    const none = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'no.methods', password: SEED_PASSWORD });
    expect(none.body.error.code).toBe('NO_LOGIN_METHOD');
  });

  it('locks after five failed passwords and unlocks after the window', async () => {
    const time = clock(new Date('2026-08-31T16:00:00.000Z'));
    const app = createApp(env(), { auth: await seed(), now: time.now });
    for (let i = 0; i < 5; i += 1) {
      const failed = await request(app)
        .post('/auth/login/password')
        .send({ login_id: 'priya.cashier', password: 'wrong' });
      if (i < 4) {
        expect(failed.status).toBe(401);
      } else {
        expect(failed.status).toBe(423);
        expect(failed.body.error.code).toBe('ACCOUNT_LOCKED');
      }
    }
    const locked = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(locked.status).toBe(423);
    time.set(new Date('2026-08-31T16:16:00.000Z'));
    const opened = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(opened.status).toBe(200);
  });

  it('issues OTP, enforces cooldown/expiry/consume, and locks shared with password', async () => {
    const time = clock(new Date('2026-08-31T16:00:00.000Z'));
    const whatsapp = new MemoryWhatsAppClient();
    const audit = new MemoryAuditClient();
    const app = createApp(env(), {
      auth: await seed(),
      whatsapp,
      audit,
      now: time.now,
      randomOtp: () => '4821',
    });
    const first = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    expect(first.status).toBe(200);
    expect(whatsapp.lastOtp).toBe('4821');
    const early = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    expect(early.status).toBe(429);
    time.set(new Date('2026-08-31T16:00:30.000Z'));
    const resent = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    expect(resent.status).toBe(200);
    const challengeId = resent.body.data.challenge_id as string;
    const wrong = await request(app)
      .post('/auth/login/otp/verify')
      .send({ login_id: 'priya.cashier', challenge_id: challengeId, otp: '0000' });
    expect(wrong.status).toBe(401);
    time.set(new Date(time.now().getTime() + OTP_TTL_MS + 1));
    const expired = await request(app)
      .post('/auth/login/otp/verify')
      .send({ login_id: 'priya.cashier', challenge_id: challengeId, otp: '4821' });
    expect(expired.body.error.code).toBe('OTP_EXPIRED');
    time.set(new Date('2026-08-31T16:01:00.000Z'));
    const fresh = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    const ok = await request(app).post('/auth/login/otp/verify').send({
      login_id: 'priya.cashier',
      challenge_id: fresh.body.data.challenge_id,
      otp: '4821',
      remember_device: true,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.device_token).toMatch(/^nm_dev_/);
    const replay = await request(app).post('/auth/login/otp/verify').send({
      login_id: 'priya.cashier',
      challenge_id: fresh.body.data.challenge_id,
      otp: '4821',
    });
    expect(replay.body.error.code).toBe('OTP_CONSUMED');
    expect(audit.events.some((event) => event.action === 'login_succeeded')).toBe(true);
  });

  it('locks the user after five OTP failures and returns undeliverable without SMS', async () => {
    const whatsapp = new MemoryWhatsAppClient();
    whatsapp.fail = true;
    const app = createApp(env(), { auth: await seed(), whatsapp, randomOtp: () => '1111' });
    const undeliverable = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    expect(undeliverable.status).toBe(503);
    expect(undeliverable.body.error.code).toBe('WHATSAPP_OTP_UNDELIVERABLE');
    const working = new MemoryWhatsAppClient();
    const time = clock(new Date('2026-08-31T16:00:00.000Z'));
    const lockedApp = createApp(env(), {
      auth: await seed(),
      whatsapp: working,
      now: time.now,
      randomOtp: () => '2222',
    });
    const issued = await request(lockedApp)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    const challengeId = issued.body.data.challenge_id as string;
    for (let i = 0; i < 5; i += 1) {
      await request(lockedApp)
        .post('/auth/login/otp/verify')
        .send({ login_id: 'priya.cashier', challenge_id: challengeId, otp: '0000' });
    }
    const sixth = await request(lockedApp)
      .post('/auth/login/otp/verify')
      .send({ login_id: 'priya.cashier', challenge_id: challengeId, otp: '2222' });
    expect(sixth.status).toBe(423);
    const password = await request(lockedApp)
      .post('/auth/login/password')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(password.status).toBe(423);
  });

  it('remembers a device, unlocks with PIN, and rejects revoked or expired tokens', async () => {
    const time = clock(new Date('2026-08-31T16:00:00.000Z'));
    const app = createApp(env(), { auth: await seed(), now: time.now });
    const remembered = await login(app, 'priya.cashier', true);
    expect(remembered.device_token).toBeTruthy();
    const unlocked = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: SEED_PIN,
      device_token: remembered.device_token,
      login_id: 'priya.cashier',
    });
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.session_token).toMatch(/^nm_sess_/);
    await request(app)
      .delete(`/auth/devices?location_id=${LOCATION}&user_id=${unlocked.body.data.user_id}`)
      .set('authorization', `Bearer ${remembered.session_token}`);
    const revoked = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: SEED_PIN,
      device_token: remembered.device_token,
      login_id: 'priya.cashier',
    });
    expect(revoked.body.error.code).toBe('INVALID_DEVICE');
    const again = await login(app, 'priya.cashier', true);
    time.set(new Date('2026-10-01T16:00:00.000Z'));
    const expired = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: SEED_PIN,
      device_token: again.device_token,
      login_id: 'priya.cashier',
    });
    expect(expired.body.error.code).toBe('DEVICE_EXPIRED');
  });

  it('keeps kiosk PIN lock off the user login lock and shares credit-limit failures', async () => {
    const app = createApp(env(), { auth: await seed() });
    const session = await login(app);
    for (let i = 0; i < 5; i += 1) {
      const failed = await request(app)
        .post('/auth/pin/verify')
        .set('authorization', `Bearer ${session.session_token}`)
        .send({ purpose: 'kiosk_exit', pin: '0000', kiosk_session_id: 'kiosk-abc' });
      if (i < 4) {
        expect(failed.status).toBe(401);
      } else {
        expect(failed.status).toBe(423);
        expect(failed.body.error.code).toBe('KIOSK_PIN_LOCKED');
      }
    }
    const stillLogin = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(stillLogin.status).toBe(200);
    const other = await login(app, 'priya.cashier');
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/auth/pin/verify')
        .set('authorization', `Bearer ${other.session_token}`)
        .send({ purpose: 'credit_limit', pin: '0000' });
    }
    const blocked = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(blocked.status).toBe(423);
  });

  it('verifies override PIN, lists devices, and forbids cashier revoke of others', async () => {
    const audit = new MemoryAuditClient();
    audit.fail = true;
    const app = createApp(env(), { auth: await seed(), audit });
    const cashier = await login(app, 'priya.cashier', true);
    const owner = await login(app, 'priya.owner');
    const verified = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${cashier.session_token}`)
      .send({ purpose: 'fefo_override', pin: SEED_PIN });
    expect(verified.status).toBe(200);
    expect(verified.body.data.verification_id).toBeTruthy();
    const listed = await request(app)
      .get(`/auth/devices?location_id=${LOCATION}`)
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(listed.body.data.items.length).toBeGreaterThan(0);
    const forbidden = await request(app)
      .delete(`/auth/devices?location_id=${LOCATION}&user_id=${owner.session_id}`)
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(forbidden.status).toBe(403);
    const ownerList = await request(app)
      .get(`/auth/devices?location_id=${LOCATION}&user_id=${listed.body.data.items[0].device_id}`)
      .set('authorization', `Bearer ${owner.session_token}`);
    expect(ownerList.status).toBe(200);
    const missingLoc = await request(app)
      .get('/auth/devices')
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(missingLoc.body.error.code).toBe('LOCATION_ID_REQUIRED');
    const mismatch = await request(app)
      .get('/auth/devices?location_id=00000000-0000-4000-8000-000000000000')
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(mismatch.body.error.code).toBe('LOCATION_TENANT_MISMATCH');
  });

  it('covers pin format, missing PIN, and session edge cases', async () => {
    const app = createApp(env(), { auth: await seed() });
    const noPinLogin = await login(app, 'no.pin');
    const pinMissing = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${noPinLogin.session_token}`)
      .send({ purpose: 'below_cost', pin: '1234' });
    expect(pinMissing.status).toBe(412);
    const rememberNoPin = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'no.pin', password: SEED_PASSWORD, remember_device: true });
    expect(rememberNoPin.body.data.device_token).toBeNull();
    const badPin = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${noPinLogin.session_token}`)
      .send({ purpose: 'below_cost', pin: '12' });
    expect(badPin.body.error.code).toBe('INVALID_PIN_FORMAT');
    const badPurpose = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${noPinLogin.session_token}`)
      .send({ purpose: 'nope', pin: '1234' });
    expect(badPurpose.status).toBe(400);
    const missingAuth = await request(app).get('/auth/session');
    expect(missingAuth.status).toBe(401);
    const jwt = await request(app).get('/auth/session').set('authorization', 'Bearer abc.def');
    expect(jwt.status).toBe(401);
    const malformed = await request(app)
      .post('/auth/login/password')
      .send({ login_id: '', password: '' });
    expect(malformed.status).toBe(400);
    const unlockNoToken = await request(app)
      .post('/auth/pin/verify')
      .send({ purpose: 'saved_device_unlock', pin: '1234', login_id: 'priya.cashier' });
    expect(unlockNoToken.status).toBe(400);
    const unlockBadPrefix = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: SEED_PIN,
      login_id: 'priya.cashier',
      device_token: 'other',
    });
    expect(unlockBadPrefix.body.error.code).toBe('INVALID_DEVICE');
  });

  it('uses HTTP clients, fixed OTP, and default opaque tokens', async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('/whatsapp/messages')) {
        const body = JSON.parse(String(init?.body)) as { params?: { otp?: string } };
        expect(body.params?.otp).toHaveLength(4);
        return new Response(JSON.stringify({ data: { status: 'failed' } }), { status: 202 });
      }
      return new Response('nope', { status: 500 });
    };
    try {
      const httpApp = createApp(
        loadAuthEnv({
          LOG_LEVEL: 'error',
          WHATSAPP_API_BASE_URL: 'http://whatsapp.test',
          WHATSAPP_SERVICE_TOKEN: 'svc',
          AUDIT_API_BASE_URL: 'http://audit.test',
          AUDIT_SERVICE_TOKEN: 'audit',
          AUTH_FIXED_OTP: '4821',
        }),
        { auth: await seed() },
      );
      const otp = await request(httpApp)
        .post('/auth/login/otp/request')
        .send({ login_id: 'priya.cashier' });
      expect(otp.status).toBe(503);
      const ok = await request(httpApp)
        .post('/auth/login/password')
        .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
      expect(ok.status).toBe(200);
    } finally {
      globalThis.fetch = previous;
    }
    const thrown = createHttpWhatsAppClient('http://whatsapp.test', 'svc');
    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    await expect(
      thrown.sendLoginOtp({
        tenantId: TENANT,
        locationId: LOCATION,
        to: '+9198',
        challengeId: 'ch',
        otp: '1234',
      }),
    ).resolves.toEqual({ delivered: false });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: { status: 'sent' } }), { status: 202 });
    await expect(
      thrown.sendLoginOtp({
        tenantId: TENANT,
        locationId: LOCATION,
        to: '+9198',
        challengeId: 'ch',
        otp: '1234',
      }),
    ).resolves.toEqual({ delivered: true });
    const auditHttp = createHttpAuthAuditClient('http://audit.test', 'token');
    globalThis.fetch = previous;
    const seeded = createMemoryAuthRepository();
    await seedAuthUsers(seeded);
    await expect(seeded.findUserByLoginId('priya.owner')).resolves.toMatchObject({ role: 'owner' });
    expect(auditHttp).toBeTruthy();
  });

  it('rate limits repeated login posts and verifies kiosk success', async () => {
    const app = createApp(env(), { auth: await seed() });
    const session = await login(app);
    const okKiosk = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${session.session_token}`)
      .send({ purpose: 'kiosk_exit', pin: SEED_PIN, kiosk_session_id: 'kiosk-ok' });
    expect(okKiosk.status).toBe(200);
    let limited = false;
    for (let i = 0; i < 25; i += 1) {
      const response = await request(app)
        .post('/auth/login/password')
        .send({ login_id: 'priya.cashier', password: 'wrong' });
      if (response.status === 429 && response.body.error.code === 'RATE_LIMITED') {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });

  it('auto-mounts /health and wires default memory clients', async () => {
    const app = createApp(env());
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
  });

  it('covers remaining OTP, device, session, and helper branches', async () => {
    const inner = await seed();
    const ownerUser = await inner.findUserByLoginId('priya.owner');
    expect(ownerUser).toBeTruthy();
    const app = createApp(env(), { auth: inner, randomOtp: () => '3333' });
    const cashier = await login(app, 'priya.cashier', true);
    const owner = await login(app, 'priya.owner');
    const rememberedUa = await request(app)
      .post('/auth/login/password')
      .set('user-agent', 'MedMateTest/1.0')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD, remember_device: true });
    expect(rememberedUa.status).toBe(200);

    const forwarded = await request(app)
      .post('/auth/login/password')
      .set('x-forwarded-for', '203.0.113.9, 10.0.0.1')
      .send({ login_id: 'priya.cashier', password: SEED_PASSWORD });
    expect(forwarded.status).toBe(200);

    const noMobile = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'otp.nomobile' });
    expect(noMobile.body.error.code).toBe('METHOD_DISABLED');
    const noHash = await request(app)
      .post('/auth/login/password')
      .send({ login_id: 'password.nohash', password: SEED_PASSWORD });
    expect(noHash.status).toBe(401);
    const otpOffVerify = await request(app)
      .post('/auth/login/otp/verify')
      .send({ login_id: 'password.only', challenge_id: 'missing', otp: '1111' });
    expect(otpOffVerify.body.error.code).toBe('METHOD_DISABLED');
    const missingChallenge = await request(app)
      .post('/auth/login/otp/verify')
      .send({ login_id: 'priya.cashier', challenge_id: 'missing', otp: '1111' });
    expect(missingChallenge.body.error.code).toBe('INVALID_OTP');
    const issued = await request(app)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    const wrongUser = await request(app).post('/auth/login/otp/verify').send({
      login_id: 'priya.owner',
      challenge_id: issued.body.data.challenge_id,
      otp: '3333',
    });
    expect(wrongUser.body.error.code).toBe('INVALID_OTP');

    const listedOther = await request(app)
      .get(`/auth/devices?location_id=${LOCATION}&user_id=${ownerUser!.userId}`)
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(listedOther.body.error.code).toBe('FORBIDDEN_ROLE');
    const ownerRevoke = await request(app)
      .delete(`/auth/devices?location_id=${LOCATION}&user_id=${ownerUser!.userId}`)
      .set('authorization', `Bearer ${owner.session_token}`);
    expect(ownerRevoke.status).toBe(200);
    const revokeMissing = await request(app)
      .delete('/auth/devices')
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(revokeMissing.body.error.code).toBe('LOCATION_ID_REQUIRED');
    const revokeMismatch = await request(app)
      .delete('/auth/devices?location_id=00000000-0000-4000-8000-000000000000')
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(revokeMismatch.body.error.code).toBe('LOCATION_TENANT_MISMATCH');

    const pinNotSetUnlock = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: SEED_PIN,
      login_id: 'no.pin',
      device_token: 'nm_dev_placeholder',
    });
    expect(pinNotSetUnlock.status).toBe(412);
    const wrongDevicePin = await request(app).post('/auth/pin/verify').send({
      purpose: 'saved_device_unlock',
      pin: '0000',
      login_id: 'priya.cashier',
      device_token: cashier.device_token,
    });
    expect(wrongDevicePin.status).toBe(401);
    const selfRevoke = await request(app)
      .delete(`/auth/devices?location_id=${LOCATION}`)
      .set('authorization', `Bearer ${cashier.session_token}`);
    expect(selfRevoke.status).toBe(200);

    const defaultKiosk = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${cashier.session_token}`)
      .send({ purpose: 'kiosk_exit', pin: SEED_PIN });
    expect(defaultKiosk.status).toBe(200);
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/auth/pin/verify')
        .set('authorization', `Bearer ${cashier.session_token}`)
        .send({ purpose: 'kiosk_exit', pin: '0000', kiosk_session_id: 'kiosk-held' });
    }
    const stillLocked = await request(app)
      .post('/auth/pin/verify')
      .set('authorization', `Bearer ${cashier.session_token}`)
      .send({ purpose: 'kiosk_exit', pin: SEED_PIN, kiosk_session_id: 'kiosk-held' });
    expect(stillLocked.body.error.code).toBe('KIOSK_PIN_LOCKED');

    expect(createRandomOtp()).toMatch(/^\d{4}$/);
    expect(createOpaqueToken('nm_sess_').startsWith('nm_sess_')).toBe(true);
    expect(clientIp({ headers: { 'x-forwarded-for': '198.51.100.4, 10.1.1.1' } })).toBe(
      '198.51.100.4',
    );
    expect(clientIp({ ip: '127.0.0.1', headers: {} })).toBe('127.0.0.1');
    expect(clientIp({ headers: { 'x-forwarded-for': '' } })).toBe('0.0.0.0');
    expect(readBody({})).toEqual({});
    const logger = createLogger({ serviceName: 'auth-api-test', level: 'error' });
    await expect(
      recordSharedFailure(
        {
          auth: inner,
          whatsapp: new MemoryWhatsAppClient(),
          audit: new MemoryAuditClient(),
          logger,
          now: () => new Date(),
          randomOtp: () => '0000',
          issueToken: createOpaqueToken,
        },
        ownerUser!,
        'other',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
    const helperRuntime = {
      auth: inner,
      whatsapp: new MemoryWhatsAppClient(),
      audit: new MemoryAuditClient(),
      logger,
      now: () => new Date(),
      randomOtp: () => '0000',
      issueToken: createOpaqueToken,
    };
    await expect(requirePharmacySession(helperRuntime, undefined)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(requirePharmacySession(helperRuntime, 'Basic nope')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      requirePharmacySession(helperRuntime, 'Bearer nm_sess_abc def'),
    ).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      createVerifyPinController(helperRuntime)({}, { body: { pin: '1234' }, headers: {} } as never),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    const previous = globalThis.fetch;
    globalThis.fetch = async () => new Response('{}', { status: 202 });
    try {
      await createHttpAuthAuditClient('http://audit.test/', 'token').ingest({
        action: 'login_succeeded',
        tenantId: TENANT,
        locationId: LOCATION,
        actorUserId: ownerUser!.userId,
        actorRole: 'Owner',
        targetId: ownerUser!.userId,
        after: { session_id: 's' },
        idempotencyKey: 'audit-http',
      });
    } finally {
      globalThis.fetch = previous;
    }
  });

  it('rejects idle sessions, missing users, and a consumed OTP race', async () => {
    const time = clock(new Date('2026-08-31T16:00:00.000Z'));
    const idleAuth = await seed(createMemoryAuthRepository(time.now));
    const idleApp = createApp(env(), { auth: idleAuth, now: time.now });
    const session = await login(idleApp);
    time.set(new Date(time.now().getTime() + SESSION_IDLE_MS + 1));
    const idle = await request(idleApp)
      .get('/auth/session')
      .set('authorization', `Bearer ${session.session_token}`);
    expect(idle.body.error.code).toBe('UNAUTHENTICATED');

    const missingInner = await seed();
    let hideUser = false;
    const missingAuth: AuthRepository = {
      ...missingInner,
      findUserById: async (userId) => (hideUser ? undefined : missingInner.findUserById(userId)),
    };
    const missingApp = createApp(env(), { auth: missingAuth });
    const live = await login(missingApp);
    hideUser = true;
    const gone = await request(missingApp)
      .get('/auth/session')
      .set('authorization', `Bearer ${live.session_token}`);
    expect(gone.body.error.code).toBe('UNAUTHENTICATED');

    const raceInner = await seed();
    const raceAuth: AuthRepository = {
      ...raceInner,
      consumeOtpChallenge: async () => false,
    };
    const raceApp = createApp(env(), { auth: raceAuth, randomOtp: () => '4444' });
    const issued = await request(raceApp)
      .post('/auth/login/otp/request')
      .send({ login_id: 'priya.cashier' });
    const raced = await request(raceApp).post('/auth/login/otp/verify').send({
      login_id: 'priya.cashier',
      challenge_id: issued.body.data.challenge_id,
      otp: '4444',
    });
    expect(raced.body.error.code).toBe('OTP_CONSUMED');
  });
});
