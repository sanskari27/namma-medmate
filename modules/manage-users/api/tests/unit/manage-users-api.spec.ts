import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  createMemoryAuthRepository,
  createMemoryTenancyRepository,
  type AuthRepository,
} from '@namma-medmate/db-services';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { createHttpAuditClient } from '../../src/audit/http-client.ts';
import { recordAudit } from '../../src/audit/record.ts';
import { loadManageUsersEnv } from '../../src/config/env.ts';
import { MemoryEmployeesLookup } from '../../src/employees/lookup.ts';
import {
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
  localSeedPharmacy,
} from '../../src/local-seed.ts';
import {
  allPermissionsTrue,
  PERMISSION_KEYS,
  roleDefaultPermissions,
} from '../../src/permissions.ts';
import { MemoryPlanGatingClient } from '../../src/plan-gating/client.ts';
import { createHttpPlanGatingClient } from '../../src/plan-gating/http-client.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import { buildShareLink } from '../../src/share-link.ts';
import { issueTempPassword } from '../../src/credentials.ts';
import { requiredPlanForLimit, toSavedDevice } from '../../src/http/mappers.ts';
import type { ManageUsersDeps } from '../../src/app.ts';

const OTHER_LOCATION = '9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210';
const CASHIER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEMP_KEY = 'unit-manage-users-temp-key';

describe('manage-users env', () => {
  it('defaults the port', () => {
    const env = loadManageUsersEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      MANAGE_USERS_TEMP_PASSWORD_KEY: 'unit-manage-users-temp-key',
    });
    expect(env.MANAGE_USERS_API_PORT).toBe(3007);
  });

  it('accepts a coerced port', () => {
    const env = loadManageUsersEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      MANAGE_USERS_API_PORT: '4011',
      MANAGE_USERS_TEMP_PASSWORD_KEY: 'unit-manage-users-temp-key',
    });
    expect(env.MANAGE_USERS_API_PORT).toBe(4011);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/manage-users/api/src/app.ts',
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

describe('helpers', () => {
  it('requires a complete pharmacy claim set', () => {
    expect(
      principalFromSession({
        sub: 'x',
        issuer: 'iss',
        audience: 'aud',
        principalType: 'pharmacy',
        tenantId: 't',
      }),
    ).toBeUndefined();
    expect(
      principalFromSession({
        sub: LOCAL_SEED_OWNER_ID,
        issuer: 'iss',
        audience: 'aud',
        principalType: 'pharmacy',
        tenantId: LOCAL_SEED_TENANT_ID,
        locationId: LOCAL_SEED_LOCATION_ID,
        role: 'owner',
      }),
    ).toMatchObject({ kind: 'pharmacy', sub: LOCAL_SEED_OWNER_ID });
  });

  it('builds a wa.me share URL without sending', () => {
    const pending = buildShareLink({
      shopName: 'Sri Krishna Medicals',
      loginId: 'ravi.cashier',
      tempPassword: 'K7mP2xQ9',
    });
    expect(pending.sent).toBe(false);
    expect(pending.url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(pending.body).toContain('ravi.cashier');
    expect(buildShareLink({ shopName: 'Shop', loginId: 'a' }).body).toContain('reset');
  });

  it('uses FR-8 cashier defaults', () => {
    const cashier = roleDefaultPermissions('cashier');
    expect(cashier['pos-billing']).toBe(true);
    expect(cashier.inventory).toBe(false);
    expect(cashier['manage-users']).toBe(false);
    expect(allPermissionsTrue().whatsapp).toBe(true);
    expect(roleDefaultPermissions('owner').dashboard).toBe(true);
    expect(roleDefaultPermissions('manager').reports).toBe(true);
    expect(requiredPlanForLimit(5)).toBe('pro');
    expect(requiredPlanForLimit(2)).toBe('growth');
    expect(
      toSavedDevice({
        deviceId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        userId: CASHIER_ID,
        tenantId: LOCAL_SEED_TENANT_ID,
        locationId: LOCAL_SEED_LOCATION_ID,
        tokenHash: 'h',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        lastUsedAt: new Date('2026-08-20T00:00:00.000Z'),
        userAgent: null,
      }).label,
    ).toBe('Saved device');
  });
});

describe('clients', () => {
  it('forwards audit ingest over HTTP', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchImpl);
    const client = createHttpAuditClient('http://audit.local', 'token');
    await client.ingest({
      action: 'user.created',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      targetId: CASHIER_ID,
      idempotencyKey: 'k',
      after: { role: 'cashier' },
    });
    expect(fetchImpl).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('reads seats from plan-gating entitlements', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { effective_plan: 'growth', seatsLimit: 5 } }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchImpl);
    const client = createHttpPlanGatingClient('http://plan.local/');
    await expect(client.getSeats('tok', LOCAL_SEED_LOCATION_ID)).resolves.toEqual({
      plan: 'growth',
      seatLimit: 5,
    });
    vi.unstubAllGlobals();
  });

  it('falls back to Free when entitlements omit the plan', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchImpl);
    await expect(
      createHttpPlanGatingClient('http://plan.local').getSeats('tok', LOCAL_SEED_LOCATION_ID),
    ).resolves.toEqual({ plan: 'free', seatLimit: 2 });
    vi.unstubAllGlobals();
  });

  it('swallows audit ingest failures', async () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const audit = new MemoryAuditClient();
    audit.fail = true;
    await recordAudit(audit, logger as never, {
      action: 'user.created',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      targetId: CASHIER_ID,
      idempotencyKey: 'k',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('wires HTTP plan-gating and audit clients from env', () => {
    expect(
      createApp(
        loadManageUsersEnv({
          OIDC_ISSUER: 'http://localhost:8081',
          OIDC_AUDIENCE: 'namma-medmate-dispensary',
          OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
          MANAGE_USERS_TEMP_PASSWORD_KEY: TEMP_KEY,
          PLAN_GATING_API_BASE_URL: 'http://plan.local',
          AUDIT_API_BASE_URL: 'http://audit.local',
          AUDIT_SERVICE_TOKEN: 'svc',
        }),
      ),
    ).toBeTruthy();
  });

  it('fails closed when the user disappears during password issue', async () => {
    const auth = createMemoryAuthRepository();
    await expect(issueTempPassword(auth, CASHIER_ID, TEMP_KEY, () => 'K7mP2xQ9')).rejects.toThrow(
      'User missing during password issue',
    );
  });
});

describe('manage-users-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'manage-users-test';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    server = createServer((req, res) => {
      if (req.url === '/jwks.json') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('jwks bind failed');
    }
    issuer = `http://127.0.0.1:${address.port}`;
    jwksUri = `${issuer}/jwks.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  function env() {
    return loadManageUsersEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
      MANAGE_USERS_TEMP_PASSWORD_KEY: TEMP_KEY,
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'manage-users-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  async function ownerToken(claimOverrides?: Record<string, unknown>) {
    return token({
      sub: LOCAL_SEED_OWNER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'owner',
      ...claimOverrides,
    });
  }

  async function seedOwner(auth: AuthRepository) {
    await auth.createUser({
      userId: LOCAL_SEED_OWNER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'priya.owner',
      role: 'owner',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: allPermissionsTrue(),
    });
  }

  async function wired(overrides?: ManageUsersDeps) {
    const auth = overrides?.auth ?? createMemoryAuthRepository();
    if (!overrides?.auth) {
      await seedOwner(auth);
    }
    const employees = overrides?.employees ?? new MemoryEmployeesLookup();
    const planGating = overrides?.planGating ?? new MemoryPlanGatingClient();
    const audit = (overrides?.audit as MemoryAuditClient | undefined) ?? new MemoryAuditClient();
    return {
      auth,
      employees,
      planGating,
      audit,
      app: createApp(env(), {
        auth,
        tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
        employees,
        planGating,
        audit,
        tempPasswordKey: TEMP_KEY,
        randomPassword: () => 'K7mP2xQ9',
        ...overrides,
      }),
    };
  }

  it('US-1 creates a Cashier within the Free seat cap and returns temp_password once', async () => {
    const { app, audit, auth } = await wired();
    const res = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'ravi.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.temp_password).toBe('K7mP2xQ9');
    expect(res.body.data.role).toBe('cashier');
    expect(res.body.data.permissions['pos-billing']).toBe(true);
    expect(res.body.data.permissions.inventory).toBe(false);
    expect(res.body.data.permissions.crm).toBe(false);
    expect(audit.events.some((event) => event.action === 'user.created')).toBe(true);
    const seats = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(seats.body.data).toMatchObject({
      plan: 'free',
      seat_limit: 2,
      active_count: 2,
      unlimited: false,
    });
    const detail = await request(app)
      .get(`/manage-users/users/${res.body.data.user_id}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(detail.body.data.temp_password).toBeUndefined();
    expect((await auth.findUserById(res.body.data.user_id as string))?.tempPasswordPending).toBe(
      true,
    );
  });

  it('US-1 refuses Add user at the seat cap', async () => {
    const { app, auth } = await wired();
    await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'existing.cashier',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
    });
    const res = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'ravi.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEAT_CAP_REACHED');
    expect(res.body.error.details).toMatchObject({
      seat_limit: 2,
      active_count: 2,
      required_plan: 'growth',
    });
    await expect(auth.findUserByLoginId('ravi.cashier')).resolves.toBeUndefined();
  });

  it('US-2 customises Manager permissions and cannot reduce Owner', async () => {
    const { app, auth } = await wired();
    const manager = await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'neha.manager',
      role: 'manager',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: roleDefaultPermissions('manager'),
    });
    const saved = await request(app)
      .put(
        `/manage-users/users/${manager.userId}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ permissions: { crm: false, 'account-settings': true }, mode: 'merge' });
    expect(saved.status).toBe(200);
    expect(saved.body.data.permissions.crm).toBe(false);
    expect(saved.body.data.permissions['account-settings']).toBe(true);
    expect(saved.body.data.role).toBe('manager');
    const ownerPut = await request(app)
      .put(
        `/manage-users/users/${LOCAL_SEED_OWNER_ID}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ permissions: { crm: false }, mode: 'merge' });
    expect(ownerPut.status).toBe(409);
    expect(ownerPut.body.error.code).toBe('OWNER_ACCESS_IMMUTABLE');
    const ownerRole = await request(app)
      .patch(`/manage-users/users/${LOCAL_SEED_OWNER_ID}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ role: 'manager' });
    expect(ownerRole.status).toBe(409);
    expect(ownerRole.body.error.code).toBe('OWNER_ACCESS_IMMUTABLE');
    const ownerOff = await request(app)
      .patch(`/manage-users/users/${LOCAL_SEED_OWNER_ID}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ active: false });
    expect(ownerOff.body.error.code).toBe('OWNER_ACCESS_IMMUTABLE');
    const ownerKeep = await request(app)
      .patch(`/manage-users/users/${LOCAL_SEED_OWNER_ID}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ login_id: 'priya.owner' });
    expect(ownerKeep.status).toBe(200);
  });

  it('US-2 reset to role defaults matches the Pharmacist FR-8 column', async () => {
    const { app, auth } = await wired();
    const pharmacist = await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'rx.pharm',
      role: 'pharmacist',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: allPermissionsTrue(),
    });
    const res = await request(app)
      .put(
        `/manage-users/users/${pharmacist.userId}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ mode: 'reset_defaults' });
    expect(res.status).toBe(200);
    expect(res.body.data.permissions).toEqual(roleDefaultPermissions('pharmacist'));
  });

  it('US-3 deactivating frees a seat and remove leaves the employee', async () => {
    const employees = new MemoryEmployeesLookup();
    employees.employees.set('e_01', {
      employeeId: 'e_01',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
    });
    const { app, auth } = await wired({ employees });
    const created = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'ravi.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
        employee_id: 'e_01',
      });
    const userId = created.body.data.user_id as string;
    const off = await request(app)
      .patch(`/manage-users/users/${userId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.data.active).toBe(false);
    expect((await auth.findUserById(userId))?.employeeId).toBe('e_01');
    const seats = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(seats.body.data.active_count).toBe(1);
    await auth.createSession({
      userId,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      tokenHash: 'sess',
    });
    await auth.createSavedDevice({
      userId,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      tokenHash: 'dev',
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    const removed = await request(app)
      .delete(`/manage-users/users/${userId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(removed.status).toBe(204);
    expect((await auth.findUserById(userId))?.removedAt).toBeInstanceOf(Date);
    expect(employees.employees.get('e_01')).toBeDefined();
  });

  it('US-3 rejects turning both auth methods off', async () => {
    const { app, auth } = await wired();
    const user = await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'otp.only',
      role: 'cashier',
      passwordEnabled: false,
      otpEnabled: true,
      otpMobile: '+919876543210',
    });
    const res = await request(app)
      .put(`/manage-users/users/${user.userId}/methods?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({ otp_enabled: false, password_enabled: false });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('AUTH_METHOD_REQUIRED');
  });

  it('enforces the §9 error catalogue', async () => {
    const { app, auth } = await wired();
    const bearer = await ownerToken();
    const missingLoc = await request(app)
      .get('/manage-users/seats')
      .set('authorization', `Bearer ${bearer}`);
    expect(missingLoc.status).toBe(400);
    expect(missingLoc.body.error.code).toBe('LOCATION_REQUIRED');
    const otherLoc = await request(app)
      .get(`/manage-users/users?location_id=${OTHER_LOCATION}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(otherLoc.status).toBe(404);
    await auth.createUser({
      userId: CASHIER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'till.cashier',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: roleDefaultPermissions('cashier'),
    });
    const cashierTok = await token({
      sub: CASHIER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'cashier',
    });
    const forbidden = await request(app)
      .get(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${cashierTok}`);
    expect(forbidden.status).toBe(403);
    const seatsOk = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${cashierTok}`);
    expect(seatsOk.status).toBe(200);
    const taken = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'till.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(taken.body.error.code).toBe('LOGIN_ID_TAKEN');
    const otp = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'otp.user',
        role: 'cashier',
        password_enabled: false,
        otp_enabled: true,
      });
    expect(otp.body.error.code).toBe('OTP_MOBILE_REQUIRED');
    const pin = await request(app)
      .put(`/manage-users/users/${CASHIER_ID}/pin?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ pin: '12' });
    expect(pin.body.error.code).toBe('VALIDATION_ERROR');
    const copy = await request(app)
      .post(`/manage-users/users/${CASHIER_ID}/password/copy?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(copy.body.error.code).toBe('TEMP_PASSWORD_UNAVAILABLE');
    const ownerAdd = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'second.owner',
        role: 'owner',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(ownerAdd.body.error.code).toBe('OWNER_ALREADY_EXISTS');
    const removeOwner = await request(app)
      .delete(`/manage-users/users/${LOCAL_SEED_OWNER_ID}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(removeOwner.body.error.code).toBe('OWNER_REQUIRED');
    const unknown = await request(app)
      .put(`/manage-users/users/${CASHIER_ID}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ permissions: { 'not-a-module': true }, mode: 'merge' });
    expect(unknown.body.error.code).toBe('UNKNOWN_MODULE_KEY');
  });

  it('is idempotent on create and conflicts on a different body', async () => {
    const { app } = await wired();
    const bearer = await ownerToken();
    const body = {
      login_id: 'idem.cashier',
      role: 'cashier',
      password_enabled: true,
      otp_enabled: false,
    };
    const first = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .set('Idempotency-Key', 'same-key')
      .send(body);
    const second = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .set('Idempotency-Key', 'same-key')
      .send(body);
    expect(second.body.data.user_id).toBe(first.body.data.user_id);
    const clash = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .set('Idempotency-Key', 'same-key')
      .send({ ...body, login_id: 'other.cashier' });
    expect(clash.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('links employees, sets PIN, copies password, and shares a deep link', async () => {
    const employees = new MemoryEmployeesLookup();
    employees.employees.set('e_01', {
      employeeId: 'e_01',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
    });
    employees.employees.set('e_02', {
      employeeId: 'e_02',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
    });
    const { app, auth } = await wired({ employees });
    const bearer = await ownerToken();
    const created = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'ravi.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: true,
        otp_mobile: '+919876543210',
        employee_id: 'e_01',
        pin: '445566',
      });
    const userId = created.body.data.user_id as string;
    expect(created.body.data.pin_set).toBe(true);
    const linked = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'other.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
        employee_id: 'e_01',
      });
    expect(linked.body.error.code).toBe('EMPLOYEE_ALREADY_LINKED');
    const copy = await request(app)
      .post(`/manage-users/users/${userId}/password/copy?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(copy.body.data.temp_password).toBe('K7mP2xQ9');
    const share = await request(app)
      .post(`/manage-users/users/${userId}/share-link?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(share.body.data.sent).toBe(false);
    expect(share.body.data.url).toContain('https://wa.me/?text=');
    await auth.createSavedDevice({
      userId,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      tokenHash: 'dev-1',
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      userAgent: 'iPad',
    });
    const devices = await request(app)
      .get(`/manage-users/users/${userId}/devices?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(devices.body.data.items).toHaveLength(1);
    const deviceId = devices.body.data.items[0].device_id as string;
    const one = await request(app)
      .delete(
        `/manage-users/users/${userId}/devices/${deviceId}?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${bearer}`);
    expect(one.status).toBe(200);
    await auth.createSavedDevice({
      userId,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      tokenHash: 'dev-2',
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    const all = await request(app)
      .delete(`/manage-users/users/${userId}/devices?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(all.status).toBe(200);
    const pinOff = await request(app)
      .delete(`/manage-users/users/${userId}/pin?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(pinOff.body.data.pin_set).toBe(false);
    const pinOn = await request(app)
      .put(`/manage-users/users/${userId}/pin?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ pin: '1234' });
    expect(pinOn.body.data.pin_set).toBe(true);
    const reset = await request(app)
      .post(`/manage-users/users/${userId}/password/reset?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(reset.body.data.temp_password_pending).toBe(true);
    const selectAll = await request(app)
      .put(`/manage-users/users/${userId}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'select_all' });
    expect(selectAll.body.data.permissions.kiosk).toBe(true);
    const ownerSelect = await request(app)
      .put(
        `/manage-users/users/${LOCAL_SEED_OWNER_ID}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'select_all' });
    expect(ownerSelect.status).toBe(200);
    const ownerReset = await request(app)
      .put(
        `/manage-users/users/${LOCAL_SEED_OWNER_ID}/permissions?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'reset_defaults' });
    expect(ownerReset.body.data.permissions['manage-users']).toBe(true);
    const listed = await request(app)
      .get(
        `/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}&role=cashier&active=true&page=1&page_size=20`,
      )
      .set('authorization', `Bearer ${bearer}`);
    expect(listed.body.data.total).toBeGreaterThan(0);
    const reactivateBlocked = await request(app)
      .patch(`/manage-users/users/${userId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ active: false });
    expect(reactivateBlocked.status).toBe(200);
    await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'fill.seat',
      role: 'manager',
      passwordEnabled: true,
      otpEnabled: false,
    });
    const cap = await request(app)
      .patch(`/manage-users/users/${userId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ active: true });
    expect(cap.body.error.code).toBe('SEAT_CAP_REACHED');
  });

  it('rolls back when credential provision fails', async () => {
    const auth = createMemoryAuthRepository();
    await seedOwner(auth);
    const wrapped: AuthRepository = {
      ...auth,
      setPasswordCredentials: async () => {
        throw new Error('hash failed');
      },
    };
    const { app } = await wired({ auth: wrapped });
    const res = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'boom.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(res.status).toBeGreaterThanOrEqual(500);
    await expect(auth.findUserByLoginId('boom.cashier')).resolves.toBeUndefined();
  });

  it('rejects HQ callers and unknown users', async () => {
    const { app } = await wired();
    const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
    const res = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${hq}`);
    expect(res.status).toBe(403);
    const ghost = await token({
      sub: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'owner',
    });
    const missing = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${ghost}`);
    expect(missing.status).toBe(403);
  });

  it('uses in-memory clients when plan-gating and audit URLs are omitted', () => {
    expect(createApp(env())).toBeTruthy();
  });

  it('covers remaining branch paths for users, permissions, and isolation', async () => {
    const planGating = new MemoryPlanGatingClient();
    planGating.seatLimit = 20;
    const employees = new MemoryEmployeesLookup();
    employees.employees.set('e_03', {
      employeeId: 'e_03',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
    });
    const { app, auth } = await wired({ planGating, employees });
    const bearer = await ownerToken();
    const loc = LOCAL_SEED_LOCATION_ID;
    const users = `/manage-users/users`;
    const badRole = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ login_id: 'intern.one', role: 'intern', password_enabled: true, otp_enabled: false });
    expect(badRole.body.error.code).toBe('VALIDATION_ERROR');
    const badLogin = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ login_id: 'ab', role: 'cashier', password_enabled: true, otp_enabled: false });
    expect(badLogin.body.error.code).toBe('VALIDATION_ERROR');
    const noLogin = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ role: 'cashier', password_enabled: true, otp_enabled: false });
    expect(noLogin.body.error.code).toBe('VALIDATION_ERROR');
    const badEmp = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'emp.missing',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
        employee_id: 'missing',
      });
    expect(badEmp.body.error.code).toBe('VALIDATION_ERROR');
    const otpOnly = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'otp.only',
        role: 'pharmacist',
        password_enabled: false,
        otp_enabled: true,
        otp_mobile: '+919876543210',
      });
    expect(otpOnly.status).toBe(201);
    expect(otpOnly.body.data.temp_password).toBeUndefined();
    const customPerms = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'perm.map',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
        permissions: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, key === 'crm'])),
      });
    expect(customPerms.status).toBe(201);
    expect(customPerms.body.data.permissions.crm).toBe(true);
    const ownerGet = await request(app)
      .get(`${users}/${LOCAL_SEED_OWNER_ID}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(ownerGet.body.data.permissions.whatsapp).toBe(true);
    const badId = await request(app)
      .get(`${users}/not-a-uuid?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(badId.body.error.code).toBe('VALIDATION_ERROR');
    const badLoc = await request(app)
      .get(`/manage-users/seats?location_id=nope`)
      .set('authorization', `Bearer ${bearer}`);
    expect(badLoc.body.error.code).toBe('VALIDATION_ERROR');
    const badListRole = await request(app)
      .get(`${users}?location_id=${loc}&role=intern`)
      .set('authorization', `Bearer ${bearer}`);
    expect(badListRole.body.error.code).toBe('VALIDATION_ERROR');
    const paged = await request(app)
      .get(`${users}?location_id=${loc}&page=2&page_size=1&active=false`)
      .set('authorization', `Bearer ${bearer}`);
    expect(paged.status).toBe(200);
    const pageZero = await request(app)
      .get(`${users}?location_id=${loc}&page=0`)
      .set('authorization', `Bearer ${bearer}`);
    expect(pageZero.status).toBe(200);
    const created = await request(app)
      .post(`${users}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        login_id: 'patch.me',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
        otp_mobile: '+919800000000',
      });
    const userId = created.body.data.user_id as string;
    const patched = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        role: 'manager',
        login_id: 'patch.mgr',
        otp_mobile: '+919811111111',
        employee_id: null,
      });
    expect(patched.body.data.role).toBe('manager');
    const linked = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ employee_id: 'e_03' });
    expect(linked.status).toBe(200);
    const clearedEmployee = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ employee_id: '' });
    expect(clearedEmployee.status).toBe(200);
    const deactivated = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ active: false });
    expect(deactivated.status).toBe(200);
    const reactivated = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ active: true });
    expect(reactivated.status).toBe(200);
    const ownerRole = await request(app)
      .patch(`${users}/${LOCAL_SEED_OWNER_ID}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ role: 'manager' });
    expect(ownerRole.body.error.code).toBe('OWNER_ACCESS_IMMUTABLE');
    const toOwner = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ role: 'owner' });
    expect(toOwner.body.error.code).toBe('VALIDATION_ERROR');
    const takenLogin = await request(app)
      .patch(`${users}/${userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ login_id: 'priya.owner' });
    expect(takenLogin.body.error.code).toBe('LOGIN_ID_TAKEN');
    const methodsKeep = await request(app)
      .put(`${users}/${userId}/methods?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({});
    expect(methodsKeep.status).toBe(200);
    const methodsMobile = await request(app)
      .put(`${users}/${userId}/methods?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({
        password_enabled: true,
        otp_enabled: true,
        otp_mobile: '+919822222222',
      });
    expect(methodsMobile.status).toBe(200);
    const mergeMissing = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'merge' });
    expect(mergeMissing.body.error.code).toBe('VALIDATION_ERROR');
    const defaultMode = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({});
    expect(defaultMode.body.error.code).toBe('VALIDATION_ERROR');
    const replaceMissing = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'replace' });
    expect(replaceMissing.body.error.code).toBe('VALIDATION_ERROR');
    const replaceMap = allPermissionsTrue();
    replaceMap.crm = false;
    const replaced = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'replace', permissions: replaceMap });
    expect(replaced.body.data.permissions.crm).toBe(false);
    const replaceUnknown = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'replace', permissions: { ...allPermissionsTrue(), nope: true } });
    expect(replaceUnknown.body.error.code).toBe('UNKNOWN_MODULE_KEY');
    const replaceIncomplete = await request(app)
      .put(`${users}/${userId}/permissions?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`)
      .send({ mode: 'replace', permissions: { crm: true } });
    expect(replaceIncomplete.body.error.code).toBe('VALIDATION_ERROR');
    const missingDevice = await request(app)
      .delete(`${users}/${userId}/devices/cccccccc-cccc-4ccc-8ccc-cccccccccccc?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(missingDevice.status).toBe(404);
    const share = await request(app)
      .post(`${users}/${otpOnly.body.data.user_id}/share-link?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(share.body.data.body).toContain('Ask the Owner');
    const foreign = await auth.createUser({
      tenantId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      locationId: loc,
      loginId: 'other.tenant',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
    });
    const leaked = await request(app)
      .get(`${users}/${foreign.userId}?location_id=${loc}`)
      .set('authorization', `Bearer ${bearer}`);
    expect(leaked.status).toBe(404);
  });

  it('returns 404 when tenancy location does not match the session', async () => {
    const seed = localSeedPharmacy();
    const { app } = await wired({
      tenancy: createMemoryTenancyRepository({
        ...seed,
        location: { ...seed.location, locationId: OTHER_LOCATION },
      }),
    });
    const res = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(res.status).toBe(404);
  });

  it('creates users when the plan seat limit is unlimited', async () => {
    const planGating = new MemoryPlanGatingClient();
    planGating.plan = 'pro';
    planGating.seatLimit = null;
    const { app, auth } = await wired({ planGating });
    await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'fill.one',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
    });
    const res = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'pro.cashier',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(res.status).toBe(201);
    const seats = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(seats.body.data.unlimited).toBe(true);
  });

  it('shares a login with a fallback shop name', async () => {
    const seed = localSeedPharmacy();
    const inner = createMemoryTenancyRepository(seed);
    let seen = 0;
    const tenancy = {
      ...inner,
      async getLocationForTenant(tenantId: string) {
        seen += 1;
        if (seen > 1) {
          return undefined;
        }
        return inner.getLocationForTenant(tenantId);
      },
    };
    const { app, auth } = await wired({ tenancy });
    const user = await auth.createUser({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'share.fallback',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
    });
    const res = await request(app)
      .post(`/manage-users/users/${user.userId}/share-link?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.body).toContain('Namma MedMate');
  });

  it('returns 500 when plan-gating seats cannot be read', async () => {
    const planGating = new MemoryPlanGatingClient();
    planGating.fail = true;
    const { app } = await wired({ planGating });
    const res = await request(app)
      .post(`/manage-users/users?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`)
      .send({
        login_id: 'cap.fail',
        role: 'cashier',
        password_enabled: true,
        otp_enabled: false,
      });
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it('forbids a removed actor', async () => {
    const { app, auth } = await wired();
    await auth.softDeleteUser(LOCAL_SEED_OWNER_ID, new Date());
    const res = await request(app)
      .get(`/manage-users/seats?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(res.status).toBe(403);
  });
});
