import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  createMemoryAuthRepository,
  createMemoryGoLiveKycRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { MemoryStorageClient } from '@namma-medmate/storage-client';
import { createHttpAccountSettingsClient } from '../../src/account-settings/client.ts';
import { createApp, resolveApiSpecPath, type GoLiveKycDeps } from '../../src/app.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { createHttpAuditClient } from '../../src/audit/http-client.ts';
import { recordAudit } from '../../src/audit/record.ts';
import { createHttpBooksGstClient } from '../../src/books/client.ts';
import { loadGoLiveKycEnv } from '../../src/config/env.ts';
import { GoLiveKycErrors } from '../../src/errors.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import { maskBank, decryptOptional } from '../../src/http/mappers.ts';
import { parseUuid, readBody } from '../../src/http/validate.ts';
import { createHttpInventoryClient, MemoryInventoryClient } from '../../src/inventory/client.ts';
import {
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
  localSeedPharmacy,
} from '../../src/local-seed.ts';
import {
  createHttpManageUsersClient,
  MemoryManageUsersClient,
} from '../../src/manage-users/client.ts';
import { MemoryPlanGatingClient } from '../../src/plan-gating/client.ts';
import { createHttpPlanGatingClient } from '../../src/plan-gating/http-client.ts';
import { MemoryBooksGstClient } from '../../src/books/client.ts';
import { MemoryAccountSettingsClient } from '../../src/account-settings/client.ts';

const CASHIER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PII_KEY = 'unit-go-live-kyc-pii-key';
const OTHER_LOCATION = '9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210';

const kycBody = {
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  drug_licence_no: 'KA-20-123456',
  drug_licence_issue: '2022-01-15',
  drug_licence_expiry: '2027-01-14',
  pharmacist_name: 'Anita Sharma',
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
  e_invoicing_enabled: false,
  bank_account_holder: 'Anita Sharma',
  bank_account_number: '123456789012',
  bank_ifsc: 'HDFC0001234',
};

const step1Body = {
  gstin: '29ABCDE1234F1Z5',
  drug_licence_no: 'KA-20-123456',
  drug_licence_issue: '2022-01-15',
  drug_licence_expiry: '2027-01-14',
  pharmacist_name: 'Anita Sharma',
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
  e_invoicing_enabled: false,
};

describe('go-live-kyc env', () => {
  it('defaults the port', () => {
    const env = loadGoLiveKycEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      GO_LIVE_KYC_PII_KEY: PII_KEY,
    });
    expect(env.GO_LIVE_KYC_API_PORT).toBe(3009);
  });

  it('accepts a coerced port', () => {
    const env = loadGoLiveKycEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      GO_LIVE_KYC_API_PORT: '4012',
      GO_LIVE_KYC_PII_KEY: PII_KEY,
    });
    expect(env.GO_LIVE_KYC_API_PORT).toBe(4012);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/go-live-kyc/api/src/app.ts',
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
  it('masks bank numbers and decrypts empty ciphertext', () => {
    expect(maskBank(null)).toBeNull();
    expect(maskBank('12')).toBe('****');
    expect(maskBank('123456789012')).toBe('****9012');
    expect(decryptOptional(null, PII_KEY)).toBeNull();
    expect(principalFromSession({ sub: 'x', issuer: 'iss', audience: 'aud' })).toBeUndefined();
    expect(
      principalFromSession({
        sub: 'ops',
        issuer: 'iss',
        audience: 'aud',
        principalType: 'hq',
      }),
    ).toMatchObject({ kind: 'hq' });
    expect(parseUuid(LOCAL_SEED_TENANT_ID, 'tenant_id')).toBe(LOCAL_SEED_TENANT_ID);
    expect(() => parseUuid('bad', 'tenant_id')).toThrow();
    expect(readBody({ req: {} })).toEqual({});
    expect(GoLiveKycErrors.forbidden().code).toBe('FORBIDDEN');
  });
});

describe('http clients', () => {
  it('maps plan-gating, inventory, books, settings, users, and audit', async () => {
    const ok = new Response(JSON.stringify({ data: { effective_plan: 'starter', modules: {} } }), {
      status: 200,
    });
    const ingest = new Response(JSON.stringify({ data: { ingest_id: 'i1' } }), { status: 200 });
    const journals = new Response(JSON.stringify({ data: { journal_ids: ['j'] } }), {
      status: 200,
    });
    const empty = new Response(JSON.stringify({ data: {} }), { status: 200 });
    const created = new Response(JSON.stringify({ data: { user_id: 'u1' } }), { status: 200 });
    const conflict = new Response('{}', { status: 409 });
    const fail = new Response('nope', { status: 500 });
    const noPlan = new Response(JSON.stringify({ data: {} }), { status: 200 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes('plan-gating') && u.includes('starter-token')) {
          return noPlan;
        }
        if (u.includes('plan-gating')) {
          return ok;
        }
        if (u.includes('inventory') && init?.method === 'POST' && u.includes('fail')) {
          return fail;
        }
        if (u.includes('inventory')) {
          return ingest;
        }
        if (u.includes('books-gst') && u.includes('posted')) {
          return conflict;
        }
        if (u.includes('books-gst') && u.includes('fail')) {
          return fail;
        }
        if (u.includes('books-gst')) {
          return journals;
        }
        if (u.includes('account-settings') && u.includes('fail')) {
          return fail;
        }
        if (u.includes('account-settings')) {
          return empty;
        }
        if (u.includes('/pin') && u.includes('fail')) {
          return fail;
        }
        if (u.includes('/pin')) {
          return empty;
        }
        if (u.includes('manage-users/users') && u.includes('cap')) {
          return conflict;
        }
        if (u.includes('manage-users/users') && u.includes('fail')) {
          return fail;
        }
        if (u.includes('manage-users/users')) {
          return created;
        }
        if (u.includes('audit')) {
          return empty;
        }
        return fail;
      }),
    );
    await expect(
      createHttpPlanGatingClient('http://plan.local').getEntitlements(
        'tok',
        LOCAL_SEED_LOCATION_ID,
      ),
    ).resolves.toEqual({ plan: 'starter', modules: {} });
    await expect(
      createHttpPlanGatingClient('http://plan.local').getEntitlements(
        'starter-token',
        LOCAL_SEED_LOCATION_ID,
      ),
    ).resolves.toEqual({ plan: 'free', modules: {} });
    await expect(
      createHttpInventoryClient('http://inv.local').ingestOpeningStock({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        zeroStock: true,
      }),
    ).resolves.toEqual({ ingest_id: 'i1' });
    await expect(
      createHttpInventoryClient('http://fail.local').ingestOpeningStock({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
      }),
    ).rejects.toThrow();
    await expect(
      createHttpBooksGstClient('http://books.local').postOpenings({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        startAtZero: true,
        cashInTillPaise: 0,
        openingKhata: [],
        openingAp: [],
      }),
    ).resolves.toEqual({ journal_ids: ['j'] });
    await expect(
      createHttpBooksGstClient('http://posted.local').postOpenings({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        startAtZero: false,
        cashInTillPaise: 1,
        openingKhata: [],
        openingAp: [],
      }),
    ).rejects.toMatchObject({ code: 'OPENING_BOOKS_ALREADY_POSTED' });
    await expect(
      createHttpBooksGstClient('http://fail.local').postOpenings({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        startAtZero: true,
        cashInTillPaise: 0,
        openingKhata: [],
        openingAp: [],
      }),
    ).rejects.toThrow();
    await expect(
      createHttpAccountSettingsClient('http://settings.local').saveInvoicePrefix({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        invoicePrefix: 'INV',
      }),
    ).resolves.toBeUndefined();
    await expect(
      createHttpAccountSettingsClient('http://fail.local').saveInvoicePrefix({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        invoicePrefix: 'INV',
      }),
    ).rejects.toThrow();
    const users = createHttpManageUsersClient('http://users.local');
    await users.setPin({
      accessToken: 't',
      locationId: LOCAL_SEED_LOCATION_ID,
      userId: LOCAL_SEED_OWNER_ID,
      pin: '1234',
    });
    await expect(
      users.createUser({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        user: {
          login_id: 'c1',
          role: 'cashier',
          password_enabled: true,
          otp_enabled: false,
        },
      }),
    ).resolves.toEqual({ user_id: 'u1' });
    await expect(
      createHttpManageUsersClient('http://cap.local').createUser({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        user: {
          login_id: 'c1',
          role: 'cashier',
          password_enabled: true,
          otp_enabled: false,
        },
      }),
    ).rejects.toMatchObject({ code: 'SEAT_CAP_REACHED' });
    await expect(
      createHttpManageUsersClient('http://fail.local').setPin({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        userId: LOCAL_SEED_OWNER_ID,
        pin: '1234',
      }),
    ).rejects.toThrow();
    await expect(
      createHttpManageUsersClient('http://fail.local').createUser({
        accessToken: 't',
        locationId: LOCAL_SEED_LOCATION_ID,
        user: {
          login_id: 'c1',
          role: 'cashier',
          password_enabled: true,
          otp_enabled: false,
        },
      }),
    ).rejects.toThrow();
    await createHttpAuditClient('http://audit.local', 'svc').ingest({
      action: 'go-live-kyc.kyc.submitted',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      actorSurface: 'pharmacy',
      targetId: LOCAL_SEED_TENANT_ID,
      idempotencyKey: 'k',
    });
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const audit = new MemoryAuditClient();
    audit.fail = true;
    await recordAudit(audit, logger as never, {
      action: 'go-live-kyc.kyc.submitted',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      actorSurface: 'pharmacy',
      targetId: LOCAL_SEED_TENANT_ID,
      idempotencyKey: 'k',
    });
    expect(logger.warn).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('wires HTTP clients from env', () => {
    expect(
      createApp(
        loadGoLiveKycEnv({
          OIDC_ISSUER: 'http://localhost:8081',
          OIDC_AUDIENCE: 'namma-medmate-dispensary',
          OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
          GO_LIVE_KYC_PII_KEY: PII_KEY,
          PLAN_GATING_API_BASE_URL: 'http://plan.local',
          AUDIT_API_BASE_URL: 'http://audit.local',
          AUDIT_SERVICE_TOKEN: 'svc',
          MANAGE_USERS_API_BASE_URL: 'http://users.local',
          INVENTORY_API_BASE_URL: 'http://inv.local',
          BOOKS_GST_API_BASE_URL: 'http://books.local',
          ACCOUNT_SETTINGS_API_BASE_URL: 'http://settings.local',
        }),
      ),
    ).toBeTruthy();
    expect(
      createApp(
        loadGoLiveKycEnv({
          OIDC_ISSUER: 'http://localhost:8081',
          OIDC_AUDIENCE: 'namma-medmate-dispensary',
          OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
          GO_LIVE_KYC_PII_KEY: PII_KEY,
        }),
      ),
    ).toBeTruthy();
  });
});

describe('go-live-kyc-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'kyc-test';
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
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'kyc-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('30m')
      .sign(keys.privateKey);
  }

  function env() {
    return loadGoLiveKycEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      GO_LIVE_KYC_PII_KEY: PII_KEY,
      LOG_LEVEL: 'error',
    });
  }

  async function app(deps: GoLiveKycDeps = {}) {
    const auth = deps.auth ?? createMemoryAuthRepository();
    if (!deps.auth) {
      await auth.createUser({
        userId: LOCAL_SEED_OWNER_ID,
        tenantId: LOCAL_SEED_TENANT_ID,
        locationId: LOCAL_SEED_LOCATION_ID,
        loginId: 'priya.owner',
        role: 'owner',
        passwordEnabled: true,
        otpEnabled: false,
        permissions: {},
      });
      await auth.createUser({
        userId: CASHIER_ID,
        tenantId: LOCAL_SEED_TENANT_ID,
        locationId: LOCAL_SEED_LOCATION_ID,
        loginId: 'ravi.cashier',
        role: 'cashier',
        passwordEnabled: true,
        otpEnabled: false,
        permissions: {},
      });
    }
    return createApp(env(), {
      auth,
      tenancy: deps.tenancy ?? createMemoryTenancyRepository(localSeedPharmacy()),
      kyc: deps.kyc ?? createMemoryGoLiveKycRepository(),
      storage: deps.storage ?? new MemoryStorageClient(),
      audit: deps.audit ?? new MemoryAuditClient(),
      planGating: deps.planGating ?? new MemoryPlanGatingClient(),
      inventory: deps.inventory ?? new MemoryInventoryClient(),
      books: deps.books ?? new MemoryBooksGstClient(),
      accountSettings: deps.accountSettings ?? new MemoryAccountSettingsClient(),
      manageUsers: deps.manageUsers ?? new MemoryManageUsersClient(),
      ...deps,
    });
  }

  async function ownerHeaders() {
    const access = await token({
      sub: LOCAL_SEED_OWNER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'owner',
    });
    return { authorization: `Bearer ${access}` };
  }

  it('US-1 blocks the gate until KYC and wizard are done', async () => {
    const express = await app();
    const headers = await ownerHeaders();
    const loc = `location_id=${LOCAL_SEED_LOCATION_ID}`;
    const gate = await request(express).get(`/go-live-kyc/gate?${loc}`).set(headers);
    expect(gate.status).toBe(200);
    expect(gate.body.data.allowed).toBe(false);
    expect(gate.body.data.blockers).toEqual(
      expect.arrayContaining(['GO_LIVE_KYC_INCOMPLETE', 'GO_LIVE_WIZARD_INCOMPLETE']),
    );
    await request(express).put(`/go-live-kyc/wizard/steps/1?${loc}`).set(headers).send(step1Body);
    await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ zero_stock: true });
    await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ start_at_zero: true });
    await request(express)
      .put(`/go-live-kyc/wizard/steps/4?${loc}`)
      .set(headers)
      .send({ invoice_prefix: 'INV', print_sample_confirmed: true });
    await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({ owner_only: true, owner_pin: '4455' });
    const completed = await request(express)
      .post(`/go-live-kyc/wizard/complete?${loc}`)
      .set(headers);
    expect(completed.status).toBe(200);
    const stillBlocked = await request(express).get(`/go-live-kyc/gate?${loc}`).set(headers);
    expect(stillBlocked.body.data.wizard_status).toBe('completed');
    expect(stillBlocked.body.data.allowed).toBe(false);
    await request(express).put(`/go-live-kyc/kyc?${loc}`).set(headers).send(kycBody);
    const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
    await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/approve?${loc}`)
      .set({ authorization: `Bearer ${hq}` });
    const open = await request(express).get(`/go-live-kyc/gate?${loc}`).set(headers);
    expect(open.body.data.allowed).toBe(true);
    expect(open.body.data.blockers).toEqual([]);
  });

  it('US-2 rejects, resubmits, and is idempotent on a second approve', async () => {
    const audit = new MemoryAuditClient();
    const express = await app({ audit });
    const headers = await ownerHeaders();
    const loc = `location_id=${LOCAL_SEED_LOCATION_ID}`;
    await request(express).put(`/go-live-kyc/kyc?${loc}`).set(headers).send(kycBody);
    const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
    const hqHeaders = { authorization: `Bearer ${hq}` };
    const missingReason = await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/reject?${loc}`)
      .set(hqHeaders)
      .send({});
    expect(missingReason.status).toBe(400);
    const rejected = await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/reject?${loc}`)
      .set(hqHeaders)
      .send({ reason: 'FSSAI missing for food SKUs' });
    expect(rejected.status).toBe(200);
    const status = await request(express).get(`/go-live-kyc/status?${loc}`).set(headers);
    expect(status.body.data.kyc_reject_reason).toBe('FSSAI missing for food SKUs');
    expect(status.body.data.gate.blockers).toContain('GO_LIVE_KYC_REJECTED');
    const resubmit = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set({ ...headers, 'idempotency-key': 'kyc-1' })
      .send({ ...kycBody, fssai_no: '11223344556677', fssai_expiry: '2026-12-31' });
    expect(resubmit.body.data.kyc_status).toBe('pending');
    const queue = await request(express)
      .get('/go-live-kyc/admin/queue?status=pending')
      .set(hqHeaders);
    expect(queue.body.data.total).toBe(1);
    await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/approve?${loc}`)
      .set(hqHeaders);
    const decisions = audit.events.filter((event) => event.action === 'go-live-kyc.kyc.approved');
    const second = await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/approve?${loc}`)
      .set(hqHeaders);
    expect(second.status).toBe(200);
    expect(second.body.data.kyc_status).toBe('approved');
    expect(
      audit.events.filter((event) => event.action === 'go-live-kyc.kyc.approved'),
    ).toHaveLength(decisions.length);
  });

  it('US-3 completes zero stock, start at zero, and owner-only PIN', async () => {
    const inventory = new MemoryInventoryClient();
    const books = new MemoryBooksGstClient();
    const users = new MemoryManageUsersClient();
    const express = await app({ inventory, books, manageUsers: users });
    const headers = await ownerHeaders();
    const loc = `location_id=${LOCAL_SEED_LOCATION_ID}`;
    const step2 = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ zero_stock: true });
    expect(step2.body.data.status).toBe('completed');
    expect(inventory.last?.zeroStock).toBe(true);
    const step3 = await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ start_at_zero: true });
    expect(step3.body.data.status).toBe('skipped');
    const step5 = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({ owner_only: true, owner_pin: '4455' });
    expect(step5.body.data.status).toBe('skipped');
    expect(users.pins.get(LOCAL_SEED_OWNER_ID)).toBe('4455');
    expect(users.created).toHaveLength(0);
  });

  it('covers failure catalogue and wizard edges', async () => {
    const inventory = new MemoryInventoryClient();
    const books = new MemoryBooksGstClient();
    const settings = new MemoryAccountSettingsClient();
    const users = new MemoryManageUsersClient();
    const plan = new MemoryPlanGatingClient();
    const storage = new MemoryStorageClient();
    const express = await app({
      inventory,
      books,
      accountSettings: settings,
      manageUsers: users,
      planGating: plan,
      storage,
    });
    const headers = await ownerHeaders();
    const loc = `location_id=${LOCAL_SEED_LOCATION_ID}`;
    const missingLoc = await request(express).get('/go-live-kyc/gate').set(headers);
    expect(missingLoc.body.error.code).toBe('LOCATION_REQUIRED');
    const cashier = await token({
      sub: CASHIER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'cashier',
    });
    const ownerOnly = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set({ authorization: `Bearer ${cashier}` })
      .send(kycBody);
    expect(ownerOnly.body.error.code).toBe('OWNER_ONLY');
    const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
    const hqOnGate = await request(express)
      .get(`/go-live-kyc/gate?${loc}`)
      .set({ authorization: `Bearer ${hq}` });
    expect(hqOnGate.status).toBe(403);
    const invalidGstin = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set(headers)
      .send({ ...kycBody, gstin: 'bad' });
    expect(invalidGstin.body.error.code).toBe('VALIDATION_ERROR');
    const fssai = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set(headers)
      .send({ ...kycBody, fssai_no: '1' });
    expect(fssai.body.error.code).toBe('KYC_FIELDS_INCOMPLETE');
    plan.fail = true;
    await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set({ ...headers, 'idempotency-key': 'same' })
      .send(kycBody);
    const replay = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set({ ...headers, 'idempotency-key': 'same' })
      .send(kycBody);
    expect(replay.status).toBe(200);
    const conflict = await request(express)
      .put(`/go-live-kyc/kyc?${loc}`)
      .set({ ...headers, 'idempotency-key': 'same' })
      .send({ ...kycBody, pan: 'ABCDE1234G' });
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    const print = await request(express)
      .put(`/go-live-kyc/wizard/steps/4?${loc}`)
      .set(headers)
      .send({ invoice_prefix: 'INV', print_sample_confirmed: false });
    expect(print.body.error.code).toBe('PRINT_SAMPLE_REQUIRED');
    const prefix = await request(express)
      .put(`/go-live-kyc/wizard/steps/4?${loc}`)
      .set(headers)
      .send({ invoice_prefix: 'x', print_sample_confirmed: true });
    expect(prefix.status).toBe(400);
    settings.fail = true;
    const settingsFail = await request(express)
      .put(`/go-live-kyc/wizard/steps/4?${loc}`)
      .set(headers)
      .send({ invoice_prefix: 'INV', print_sample_confirmed: true });
    expect(settingsFail.status).toBe(400);
    settings.fail = false;
    const upload = await request(express)
      .post(`/go-live-kyc/wizard/steps/2/upload-url?${loc}`)
      .set(headers)
      .send({ file_name: 'opening-stock.csv', content_type: 'text/csv', byte_size: 12 });
    expect(upload.body.data.object_key).toContain('opening-stock');
    const badUpload = await request(express)
      .post(`/go-live-kyc/wizard/steps/2/upload-url?${loc}`)
      .set(headers)
      .send({ file_name: 'x.png', content_type: 'image/png', byte_size: 12 });
    expect(badUpload.status).toBe(400);
    const missingStep2 = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({});
    expect(missingStep2.status).toBe(400);
    const badKey = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ object_key: 'not-issued' });
    expect(badKey.body.error.code).toBe('UPLOAD_KEY_INVALID');
    inventory.fail = true;
    const csvFail = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ object_key: upload.body.data.object_key });
    expect(csvFail.body.error.code).toBe('OPENING_STOCK_FAILED');
    inventory.fail = false;
    const csvOk = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ object_key: upload.body.data.object_key });
    expect(csvOk.body.data.status).toBe('completed');
    const skipPosted = await request(express)
      .post(`/go-live-kyc/wizard/steps/2?${loc}`)
      .set(headers)
      .send({ zero_stock: true });
    expect(skipPosted.body.data.status).toBe('completed');
    books.fail = true;
    const booksFail = await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ cash_in_till_paise: 1 });
    expect(booksFail.body.error.code).toBe('OPENING_BOOKS_FAILED');
    books.fail = false;
    const booksOk = await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ cash_in_till_paise: 500000, opening_khata: [], opening_ap: [] });
    expect(booksOk.body.data.status).toBe('completed');
    const secondBooks = await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ cash_in_till_paise: 1 });
    expect(secondBooks.body.error.code).toBe('OPENING_BOOKS_ALREADY_POSTED');
    const skipBooks = await request(express)
      .put(`/go-live-kyc/wizard/steps/3?${loc}`)
      .set(headers)
      .send({ skip_if_posted: true });
    expect(skipBooks.body.data.status).toBe('skipped');
    users.seatCapReached = true;
    const cap = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({
        owner_only: false,
        owner_pin: '1234',
        user: { login_id: 'c1', role: 'cashier', password_enabled: true, otp_enabled: false },
      });
    expect(cap.body.error.code).toBe('SEAT_CAP_REACHED');
    users.seatCapReached = false;
    const pinBad = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({ owner_only: true, owner_pin: '12' });
    expect(pinBad.status).toBe(400);
    const missingUser = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({ owner_only: false, owner_pin: '1234' });
    expect(missingUser.status).toBe(400);
    users.fail = true;
    const pinFail = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({ owner_only: true, owner_pin: '1234' });
    expect(pinFail.status).toBe(400);
    users.fail = false;
    const addUser = await request(express)
      .put(`/go-live-kyc/wizard/steps/5?${loc}`)
      .set(headers)
      .send({
        owner_only: false,
        owner_pin: '1234',
        user: {
          login_id: 'cashier1',
          role: 'cashier',
          password_enabled: true,
          otp_enabled: false,
          pin: '5566',
        },
      });
    expect(addUser.body.data.created_user_id).toBe('user_created');
    const incomplete = await request(express)
      .post(`/go-live-kyc/wizard/complete?${loc}`)
      .set(headers);
    expect(incomplete.status).toBe(400);
    await request(express).put(`/go-live-kyc/wizard/steps/1?${loc}`).set(headers).send(step1Body);
    await request(express)
      .put(`/go-live-kyc/wizard/steps/4?${loc}`)
      .set(headers)
      .send({ invoice_prefix: 'INV', print_sample_confirmed: true });
    const done = await request(express).post(`/go-live-kyc/wizard/complete?${loc}`).set(headers);
    expect(done.body.data.wizard_status).toBe('completed');
    const wizard = await request(express).get(`/go-live-kyc/wizard?${loc}`).set(headers);
    expect(wizard.body.data.steps['1_profile'].status).toBe('completed');
    const rerun = await request(express).post(`/go-live-kyc/wizard/rerun?${loc}`).set(headers);
    expect(rerun.body.data.wizard_status).toBe('in_progress');
    const wrongLoc = await request(express)
      .get(`/go-live-kyc/gate?location_id=${OTHER_LOCATION}`)
      .set(headers);
    expect(wrongLoc.status).toBe(404);
    const hqHeaders = { authorization: `Bearer ${hq}` };
    const notPending = await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/approve?${loc}`)
      .set(hqHeaders);
    expect(notPending.body.error.code).toBe('KYC_NOT_PENDING');
    const rejectNotPending = await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/reject?${loc}`)
      .set(hqHeaders)
      .send({ reason: 'nope' });
    expect(rejectNotPending.body.error.code).toBe('KYC_NOT_PENDING');
    const missingPharmacy = await request(express)
      .get(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}?location_id=${OTHER_LOCATION}`)
      .set(hqHeaders);
    expect(missingPharmacy.status).toBe(404);
    const cashierOnQueue = await request(express).get('/go-live-kyc/admin/queue').set(headers);
    expect(cashierOnQueue.status).toBe(403);
    await request(express).put(`/go-live-kyc/kyc?${loc}`).set(headers).send(kycBody);
    await request(express)
      .post(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}/kyc/approve?${loc}`)
      .set(hqHeaders);
    const detail = await request(express)
      .get(`/go-live-kyc/admin/pharmacies/${LOCAL_SEED_TENANT_ID}?${loc}`)
      .set(hqHeaders);
    expect(detail.body.data.bank_account_number_masked).toBe('****9012');
    const reopen = await request(express)
      .put(`/go-live-kyc/wizard/steps/1?${loc}`)
      .set(headers)
      .send({ ...step1Body, gstin: '27ABCDE1234F1Z5' });
    expect(reopen.status).toBe(200);
    const gate = await request(express).get(`/go-live-kyc/gate?${loc}`).set(headers);
    expect(gate.body.data.kyc_status).toBe('pending');
    await request(express).get('/go-live-kyc/admin/queue?status=nope&page=0').set(hqHeaders);
    const emptyBody = await request(express).put(`/go-live-kyc/kyc?${loc}`).set(headers).send('x');
    expect(emptyBody.status).toBeGreaterThanOrEqual(400);
  });
});
