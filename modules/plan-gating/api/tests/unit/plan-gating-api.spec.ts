import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createMemoryTenancyRepository } from '@namma-medmate/db-services';
import { createApp, createDefaultDeps, resolveApiSpecPath } from '../../src/app.ts';
import { loadPlanGatingEnv } from '../../src/config/env.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import {
  catalogueItem,
  isModuleKey,
  isStaffRole,
  minimumPlanForModule,
  MODULE_KEYS,
  PLAN_CATALOGUE,
  roleDefaults,
} from '../../src/catalogue.ts';
import { MemoryOverrideReader } from '../../src/deps/overrides.ts';
import { MemorySeatsReader } from '../../src/deps/seats.ts';
import { MemorySubscriptionReader } from '../../src/deps/subscription.ts';
import {
  localSeedPharmacy,
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_TENANT_ID,
} from '../../src/local-seed.ts';
import type { PlanGatingDeps } from '../../src/app.ts';

const OTHER_LOCATION = '9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210';

describe('plan-gating env', () => {
  it('loads required oidc settings and defaults the port', () => {
    const env = loadPlanGatingEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
    });
    expect(env.PLAN_GATING_API_PORT).toBe(3006);
  });

  it('accepts a coerced port', () => {
    const env = loadPlanGatingEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      PLAN_GATING_API_PORT: '4011',
    });
    expect(env.PLAN_GATING_API_PORT).toBe(4011);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/plan-gating/api/src/app.ts',
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

describe('principalFromSession', () => {
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
      principalFromSession({ sub: 'ops', issuer: 'iss', audience: 'aud', principalType: 'hq' }),
    ).toEqual({ kind: 'hq', sub: 'ops' });
  });
});

describe('catalogue', () => {
  it('does not offer extra-seat or extra-branch products', () => {
    expect(PLAN_CATALOGUE.map((item) => item.plan)).toEqual(['free', 'starter', 'growth', 'pro']);
    expect(JSON.stringify(PLAN_CATALOGUE)).not.toMatch(
      /extra-seat|extra-branch|unlimited branches/i,
    );
  });

  it('uses Starter seats 2 and Pro unlimited null', () => {
    expect(catalogueItem('starter').seats_limit).toBe(2);
    expect(catalogueItem('pro').seats_limit).toBeNull();
    expect(catalogueItem('starter').annual_savings_copy).toBe('~5% off');
    expect(catalogueItem('growth').annual_savings_copy).toBe('~15% off');
    expect(catalogueItem('pro').annual_savings_copy).toBe('~20% off');
  });

  it('maps minimum plans for packaging keys', () => {
    expect(minimumPlanForModule('dashboard')).toBe('free');
    expect(minimumPlanForModule('inventory')).toBe('free');
    expect(minimumPlanForModule('prescriptions')).toBe('starter');
    expect(minimumPlanForModule('reports')).toBe('growth');
    expect(minimumPlanForModule('kiosk')).toBe('pro');
  });

  it('exposes Owner all-true role defaults and Cashier inventory off', () => {
    const defaults = roleDefaults();
    for (const key of MODULE_KEYS) {
      expect(defaults.Owner[key]).toBe(true);
    }
    expect(defaults.Cashier.inventory).toBe(false);
    expect(defaults.Cashier.khata).toBe(true);
    expect(defaults.Manager['manage-users']).toBe(false);
    expect(defaults.Pharmacist.khata).toBe(false);
    expect(isModuleKey('crm')).toBe(true);
    expect(isModuleKey('not-a-module')).toBe(false);
    expect(isStaffRole('Owner')).toBe(true);
    expect(isStaffRole('owner')).toBe(false);
  });
});

describe('plan-gating-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'plan-gating-test';
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
    return loadPlanGatingEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'plan-gating-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  function deps(overrides?: Partial<PlanGatingDeps>): PlanGatingDeps {
    return {
      tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
      subscriptions: new MemorySubscriptionReader(),
      overrides: new MemoryOverrideReader(),
      seats: new MemorySeatsReader(),
      ...overrides,
    };
  }

  function app(custom = deps()) {
    return createApp(env(), custom);
  }

  async function hqToken() {
    return token({ sub: 'ops-1', principal_type: 'hq' });
  }

  async function pharmacyToken(claimOverrides?: Record<string, unknown>) {
    return token({
      sub: 'chemist-1',
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'owner',
      ...claimOverrides,
    });
  }

  it('US-1 AC-1 treats missing subscription as Free', async () => {
    const res = await request(app())
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('free');
    expect(res.body.data.effective_plan).toBe('free');
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.seatsLimit).toBe(2);
    expect(res.body.data.modules['pos-billing']).toBe(true);
    expect(res.body.data.modules.orders).toBe(true);
    expect(res.body.data.modules.kiosk).toBe(false);
    expect(res.body.data.modules.crm).toBe(false);
    expect(res.body.data.seats_used_unknown).toBe(true);
  });

  it('US-2 AC-1 expired Growth behaves like Free', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'expired' });
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('growth');
    expect(res.body.data.effective_plan).toBe('free');
    expect(res.body.data.status).toBe('expired');
    expect(res.body.data.modules.reports).toBe(false);
    expect(res.body.data.modules['pos-billing']).toBe(true);
    expect(res.body.data.seatsLimit).toBe(2);
  });

  it('treats past_due and suspended as expired', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'starter', status: 'past_due' });
    const pastDue = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(pastDue.body.data.effective_plan).toBe('free');
    expect(pastDue.body.data.status).toBe('expired');
    expect(pastDue.body.data.modules.prescriptions).toBe(false);

    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'pro', status: 'suspended' });
    const suspended = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(suspended.body.data.modules.kiosk).toBe(false);
    expect(suspended.body.data.status).toBe('expired');
  });

  it('active Growth unlocks Growth keys and keeps kiosk locked', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'active' });
    const seats = new MemorySeatsReader();
    seats.unknown = false;
    seats.seatsUsed = 4;
    const res = await request(app(deps({ subscriptions, seats })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.effective_plan).toBe('growth');
    expect(res.body.data.seatsLimit).toBe(5);
    expect(res.body.data.seatsUsed).toBe(4);
    expect(res.body.data.seats_used_unknown).toBeUndefined();
    expect(res.body.data.modules.reports).toBe(true);
    expect(res.body.data.modules.kiosk).toBe(false);
  });

  it('US-4 AC-3 active Pro seatsLimit is null and kiosk is unlocked', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'pro', status: 'active' });
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.seatsLimit).toBeNull();
    expect(res.body.data.modules.kiosk).toBe(true);
  });

  it('active Starter unlocks khata and keeps reports locked', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'starter', status: 'active' });
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.modules.khata).toBe(true);
    expect(res.body.data.modules.employees).toBe(true);
    expect(res.body.data.modules.reports).toBe(false);
    expect(res.body.data.seatsLimit).toBe(2);
  });

  it('active Free subscription stays Free', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'free', status: 'active' });
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.plan).toBe('free');
    expect(res.body.data.status).toBe('active');
  });

  it('US-3 AC-1 support override unlocks reports on Free', async () => {
    const overrides = new MemoryOverrideReader();
    overrides.seed(LOCAL_SEED_TENANT_ID, { reports: true });
    const res = await request(app(deps({ overrides })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.modules.reports).toBe(true);
    expect(res.body.data.overrides.reports).toBe(true);
  });

  it('US-3 AC-2 ignores override that would lock pos-billing', async () => {
    const overrides = new MemoryOverrideReader();
    overrides.seed(LOCAL_SEED_TENANT_ID, { 'pos-billing': false, orders: false });
    const res = await request(app(deps({ overrides })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.modules['pos-billing']).toBe(true);
    expect(res.body.data.modules.orders).toBe(true);
  });

  it('US-3 AC-3 honour kiosk false on Pro', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'pro', status: 'active' });
    const overrides = new MemoryOverrideReader();
    overrides.seed(LOCAL_SEED_TENANT_ID, { kiosk: false, unknown_key: true });
    const res = await request(app(deps({ subscriptions, overrides })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.modules.kiosk).toBe(false);
    expect(res.body.data.overrides.kiosk).toBe(false);
    expect(res.body.data.overrides.unknown_key).toBeUndefined();
  });

  it('fail-closed paid modules when billing cannot be read', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.fail = true;
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.effective_plan).toBe('free');
    expect(res.body.data.modules['pos-billing']).toBe(true);
    expect(res.body.data.modules.kiosk).toBe(false);
  });

  it('returns seatsUsed 0 when manage-users throws', async () => {
    const seats = new MemorySeatsReader();
    seats.fail = true;
    const res = await request(app(deps({ seats })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.seatsUsed).toBe(0);
    expect(res.body.data.seats_used_unknown).toBe(true);
  });

  it('logs and continues when overrides throw', async () => {
    const overrides = new MemoryOverrideReader();
    overrides.fail = true;
    const res = await request(app(deps({ overrides })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.overrides).toEqual({});
  });

  it('paywall for reports on expired Growth names Growth at 1499', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'expired' });
    const res = await request(app(deps({ subscriptions })))
      .get(`/plan-gating/paywall?module_key=reports&location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.unlocked).toBe(false);
    expect(res.body.data.required_plan).toBe('growth');
    expect(res.body.data.monthly_inr).toBe(1499);
  });

  it('paywall for inventory is unlocked on Free', async () => {
    const res = await request(app())
      .get(`/plan-gating/paywall?module_key=inventory&location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.body.data.unlocked).toBe(true);
    expect(res.body.data.required_plan).toBe('free');
  });

  it('HQ can read plans and role defaults', async () => {
    const plans = await request(app())
      .get('/plan-gating/plans')
      .set('authorization', `Bearer ${await hqToken()}`);
    expect(plans.status).toBe(200);
    expect(plans.body.data.items).toHaveLength(4);
    const roles = await request(app())
      .get('/plan-gating/role-defaults')
      .set('authorization', `Bearer ${await hqToken()}`);
    expect(roles.status).toBe(200);
    expect(roles.body.data.Owner.kiosk).toBe(true);
  });

  it('US-5 AC-1 Owner evaluate ignores ticks when Growth is unlocked', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'active' });
    const res = await request(app(deps({ subscriptions })))
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'crm',
        role: 'Owner',
        ticks: { crm: false },
      });
    expect(res.body.data).toEqual({ allowed: true, reason: 'ok' });
  });

  it('US-5 AC-2 Cashier inventory is role_denied on Free', async () => {
    const res = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'inventory',
        role: 'Cashier',
      });
    expect(res.body.data).toEqual({ allowed: false, reason: 'role_denied' });
  });

  it('US-5 AC-3 Cashier khata on Free is plan_locked', async () => {
    const res = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'khata',
        role: 'Cashier',
        ticks: { khata: true },
      });
    expect(res.body.data).toEqual({ allowed: false, reason: 'plan_locked' });
  });

  it('evaluate uses explicit tick false for non-Owner', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'active' });
    const res = await request(app(deps({ subscriptions })))
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'crm',
        role: 'Manager',
        ticks: { crm: false },
      });
    expect(res.body.data.reason).toBe('role_denied');
  });

  it('rejects missing location_id', async () => {
    const res = await request(app())
      .get('/plan-gating/entitlements')
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LOCATION_ID_REQUIRED');
  });

  it('rejects location tenant mismatch', async () => {
    const res = await request(app())
      .get(`/plan-gating/entitlements?location_id=${OTHER_LOCATION}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LOCATION_TENANT_MISMATCH');
  });

  it('rejects HQ on entitlements', async () => {
    const res = await request(app())
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await hqToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PHARMACY_SESSION_REQUIRED');
  });

  it('rejects unknown module_key on paywall', async () => {
    const res = await request(app())
      .get(`/plan-gating/paywall?module_key=nope&location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_MODULE');
  });

  it('rejects invalid location uuid and uses session tenant on evaluate', async () => {
    const badLocation = await request(app())
      .get('/plan-gating/entitlements?location_id=not-a-uuid')
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(badLocation.status).toBe(400);
    expect(badLocation.body.error.code).toBe('VALIDATION_FAILED');

    const sessionTenant = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'inventory',
        role: 'Owner',
      });
    expect(sessionTenant.status).toBe(200);
    expect(sessionTenant.body.data).toEqual({ allowed: true, reason: 'ok' });

    const badRole = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'crm',
        role: 'owner',
      });
    expect(badRole.status).toBe(400);
    expect(badRole.body.error.code).toBe('VALIDATION_FAILED');

    const badModule = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'nope',
        role: 'Owner',
      });
    expect(badModule.body.error.code).toBe('UNKNOWN_MODULE');

    const mismatchTenant = await request(app())
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: OTHER_LOCATION,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'crm',
        role: 'Owner',
      });
    expect(mismatchTenant.status).toBe(403);
  });

  it('treats array ticks as empty and mismatches tenancy location', async () => {
    const subscriptions = new MemorySubscriptionReader();
    subscriptions.seed(LOCAL_SEED_TENANT_ID, { plan: 'growth', status: 'active' });
    const arrayTicks = await request(app(deps({ subscriptions })))
      .post('/plan-gating/evaluate')
      .set('authorization', `Bearer ${await pharmacyToken()}`)
      .send({
        tenant_id: LOCAL_SEED_TENANT_ID,
        location_id: LOCAL_SEED_LOCATION_ID,
        module_key: 'crm',
        role: 'Manager',
        ticks: [],
      });
    expect(arrayTicks.body.data.reason).toBe('ok');

    const seed = localSeedPharmacy();
    const tenancy = createMemoryTenancyRepository({
      ...seed,
      location: { ...seed.location, locationId: OTHER_LOCATION },
    });
    const mismatch = await request(app(deps({ tenancy })))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(mismatch.status).toBe(403);
  });

  it('rejects incomplete pharmacy principal on plans', async () => {
    const res = await request(app())
      .get('/plan-gating/plans')
      .set('authorization', `Bearer ${await token({ sub: 'x', principal_type: 'pharmacy' })}`);
    expect(res.status).toBe(403);
  });

  it('rejects location that is not in tenancy', async () => {
    const empty = deps({ tenancy: createMemoryTenancyRepository() });
    const res = await request(app(empty))
      .get(`/plan-gating/entitlements?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('LOCATION_TENANT_MISMATCH');
  });

  it('createDefaultDeps seeds the local pharmacy', () => {
    const seeded = createDefaultDeps();
    expect(seeded.tenancy).toBeDefined();
  });
});
