import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createMemoryAuditRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { ErrorCode } from '@namma-medmate/constants';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { createGetEventController } from '../../src/controllers/get-event.controller.ts';
import { createListEventsController } from '../../src/controllers/list-events.controller.ts';
import { createIngestEventController } from '../../src/controllers/ingest-event.controller.ts';
import { loadAuditEnv } from '../../src/config/env.ts';
import {
  principalFromSession,
  requirePharmacy,
  requireQueryPrincipal,
  requireService,
} from '../../src/auth/principal.ts';
import { AuditErrors } from '../../src/errors.ts';
import {
  localSeedPharmacy,
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_TENANT_ID,
} from '../../src/local-seed.ts';
import { resolveLocation } from '../../src/tenancy/resolve-location.ts';
import {
  assertNoSecrets,
  assertSnapshotSize,
  jsonHasForbiddenKeys,
  parseLimit,
  parseOptionalDate,
  parseOptionalUuid,
  parseUuid,
} from '../../src/http/validate.ts';
import { requirePharmacyLocation, resolveQueryScope } from '../../src/http/scope.ts';

const SERVICE = 'e2e-audit-service';

function billBody(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: 'bill-posted:seed:INV-24-00018',
    tenant_id: LOCAL_SEED_TENANT_ID,
    location_id: LOCAL_SEED_LOCATION_ID,
    actor_user_id: 'user-111',
    actor_role: 'Pharmacist',
    actor_surface: 'pharmacy',
    action: 'bill_posted',
    target_type: 'Bill',
    target_id: 'INV-24-00018',
    money_or_stock: true,
    before: { batch_qty: { 'SKU1:B1': 10 } },
    after: { batch_qty: { 'SKU1:B1': 8 }, tender: 'cash', invoice_total: '186.00' },
    client_occurred_at: '2026-08-31T12:00:00.000Z',
    request_id: 'req-abc',
    ...overrides,
  };
}

describe('audit env', () => {
  it('loads required settings and defaults the port', () => {
    const env = loadAuditEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      AUDIT_SERVICE_TOKEN: 'svc',
    });
    expect(env.AUDIT_API_PORT).toBe(3004);
    expect(env.AUDIT_PERSISTENCE).toBe('memory');
  });

  it('accepts postgres persistence and a coerced port', () => {
    const env = loadAuditEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      AUDIT_SERVICE_TOKEN: 'svc',
      AUDIT_PERSISTENCE: 'postgres',
      AUDIT_API_PORT: '4012',
      DATABASE_URL: 'postgres://namma:namma@127.0.0.1:5432/namma',
    });
    expect(env.AUDIT_PERSISTENCE).toBe('postgres');
    expect(env.AUDIT_API_PORT).toBe(4012);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/audit/api/src/app.ts',
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
  it('maps principals and validation helpers', () => {
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
    expect(() => requireService(undefined)).toThrow();
    expect(() => requireQueryPrincipal(undefined)).toThrow();
    expect(() => requirePharmacy(undefined)).toThrow();
    expect(() => parseUuid('nope', 'tenant_id')).toThrow();
    expect(parseOptionalUuid(undefined, 'tenant_id')).toBeUndefined();
    expect(parseOptionalUuid('', 'tenant_id')).toBeUndefined();
    expect(() => parseOptionalUuid(1, 'tenant_id')).toThrow();
    expect(parseLimit(undefined)).toBe(50);
    expect(parseLimit('500')).toBe(200);
    expect(() => parseLimit('nope')).toThrow();
    expect(parseOptionalDate(undefined, 'from')).toBeUndefined();
    expect(() => parseOptionalDate(1, 'from')).toThrow();
    expect(() => parseOptionalDate('not-a-date', 'from')).toThrow();
    expect(jsonHasForbiddenKeys([{ nested: { gstn_password: 'x' } }])).toBe(true);
    expect(jsonHasForbiddenKeys({ updated: true })).toBe(false);
    expect(() =>
      resolveQueryScope({ kind: 'service', sub: 'svc' }, undefined, undefined),
    ).toThrow();
    expect(localSeedPharmacy().location.displayName).toBe('Sri Krishna Medicals');
    expect(AuditErrors.validationFailed('x').message).toBe('x');
    expect(AuditErrors.locationNotFound().code).toBe(ErrorCode.LOCATION_NOT_FOUND);
    expect(requireService({ kind: 'service', sub: 'svc' }).kind).toBe('service');
    expect(requireQueryPrincipal({ kind: 'hq', sub: 'ops' }).kind).toBe('hq');
    expect(
      requirePharmacy({
        kind: 'pharmacy',
        sub: 'u',
        tenantId: LOCAL_SEED_TENANT_ID,
        locationId: LOCAL_SEED_LOCATION_ID,
        role: 'owner',
      }).kind,
    ).toBe('pharmacy');
    expect(() => parseUuid(undefined, 'audit_event_id')).toThrow();
    expect(AuditErrors.unauthorized().code).toBe(ErrorCode.UNAUTHORIZED);
    expect(AuditErrors.notFound().code).toBe(ErrorCode.NOT_FOUND);
    expect(
      requirePharmacyLocation(
        {
          kind: 'pharmacy',
          sub: 'u',
          tenantId: LOCAL_SEED_TENANT_ID,
          locationId: LOCAL_SEED_LOCATION_ID,
          role: 'owner',
        },
        LOCAL_SEED_LOCATION_ID,
      ).locationId,
    ).toBe(LOCAL_SEED_LOCATION_ID);
    expect(() =>
      requirePharmacyLocation({ kind: 'hq', sub: 'ops' }, LOCAL_SEED_LOCATION_ID),
    ).toThrow();
    expect(() => requirePharmacyLocation(undefined, LOCAL_SEED_LOCATION_ID)).toThrow();
    expect(() =>
      resolveQueryScope({ kind: 'hq', sub: 'ops' }, undefined, LOCAL_SEED_LOCATION_ID),
    ).toThrow();
    expect(() =>
      resolveQueryScope({ kind: 'hq', sub: 'ops' }, LOCAL_SEED_TENANT_ID, undefined),
    ).toThrow();
  });

  it('rejects oversized snapshots and secret keys', () => {
    expect(() => assertSnapshotSize({ blob: 'x'.repeat(70_000) })).toThrow();
    expect(() => assertSnapshotSize(undefined)).not.toThrow();
    expect(() => assertNoSecrets({ pin: '1' }, { updated: true })).toThrow();
  });
});

describe('audit-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'audit-test';
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
    return loadAuditEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
      AUDIT_SERVICE_TOKEN: SERVICE,
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'audit-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  async function pharmacyToken(overrides?: Record<string, unknown>) {
    return token({
      sub: 'chemist-1',
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'pharmacist',
      ...overrides,
    });
  }

  async function hqToken() {
    return token({ sub: 'ops-1', principal_type: 'hq' });
  }

  function app() {
    return createApp(env(), {
      tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
      events: createMemoryAuditRepository(),
    });
  }

  async function ingest(serverApp: ReturnType<typeof createApp>, body: Record<string, unknown>) {
    return request(serverApp)
      .post('/audit/events')
      .set('Authorization', `Bearer ${SERVICE}`)
      .send(body);
  }

  it('auto-mounts /health', async () => {
    const response = await request(app()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    const defaults = await request(createApp(env())).get('/health');
    expect(defaults.status).toBe(200);
  });

  it('ingests bill_posted and returns the same snapshots on query', async () => {
    const serverApp = app();
    const created = await ingest(serverApp, billBody());
    expect(created.status).toBe(201);
    expect(created.body.data.deduped).toBe(false);
    const listed = await request(serverApp)
      .get('/audit/events')
      .query({ location_id: LOCAL_SEED_LOCATION_ID, target_id: 'INV-24-00018' })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0].before).toEqual({ batch_qty: { 'SKU1:B1': 10 } });
    const got = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(got.status).toBe(200);
    expect(got.body.data.action).toBe('bill_posted');
  });

  it('dedupes the same idempotency_key', async () => {
    const serverApp = app();
    const first = await ingest(serverApp, billBody({ idempotency_key: 'same-key' }));
    const second = await ingest(serverApp, billBody({ idempotency_key: 'same-key' }));
    expect(second.status).toBe(200);
    expect(second.body.data.deduped).toBe(true);
    expect(second.body.data.audit_event_id).toBe(first.body.data.audit_event_id);
  });

  it('rejects PATCH and leaves the row unchanged', async () => {
    const serverApp = app();
    const created = await ingest(serverApp, billBody({ idempotency_key: 'patch-me' }));
    const patched = await request(serverApp)
      .patch(`/audit/events/${created.body.data.audit_event_id}`)
      .set('Authorization', `Bearer ${SERVICE}`)
      .send({ action: 'mutated' });
    expect([404, 405]).toContain(patched.status);
    const got = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(got.body.data.action).toBe('bill_posted');
  });

  it('lists duty clocks and repayments for a shop', async () => {
    const serverApp = app();
    await ingest(
      serverApp,
      billBody({
        idempotency_key: 'duty-1',
        action: 'duty_clock_in',
        target_type: 'DutyShift',
        target_id: 'shift-1',
        money_or_stock: false,
        before: undefined,
        after: undefined,
      }),
    );
    await ingest(
      serverApp,
      billBody({
        idempotency_key: 'khata-1',
        action: 'khata_repayment_posted',
        target_type: 'KhataLedger',
        target_id: 'khata-1',
        money_or_stock: true,
        before: { balance: '100.00' },
        after: { balance: '0.00' },
      }),
    );
    const listed = await request(serverApp)
      .get('/audit/events')
      .query({
        location_id: LOCAL_SEED_LOCATION_ID,
        from: '2020-01-01T00:00:00.000Z',
        to: '2099-01-01T00:00:00.000Z',
      })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    const actions = listed.body.data.items.map((row: { action: string }) => row.action);
    expect(actions).toContain('duty_clock_in');
    expect(actions).toContain('khata_repayment_posted');
  });

  it('requires location_id on pharmacy query', async () => {
    const response = await request(app())
      .get('/audit/events')
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('LOCATION_ID_REQUIRED');
  });

  it('hides other tenants with 404', async () => {
    const serverApp = app();
    const created = await ingest(serverApp, billBody({ idempotency_key: 'other-tenant' }));
    const other = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set(
        'Authorization',
        `Bearer ${await pharmacyToken({
          tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          location_id: LOCAL_SEED_LOCATION_ID,
        })}`,
      );
    expect(other.status).toBe(404);
    const hidden = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .query({ location_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
      .set(
        'Authorization',
        `Bearer ${await pharmacyToken({
          tenant_id: LOCAL_SEED_TENANT_ID,
          location_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        })}`,
      );
    expect(hidden.status).toBe(404);
    const mismatch = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .query({ location_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(mismatch.status).toBe(403);
    const missing = await request(serverApp)
      .get(`/audit/events/${crypto.randomUUID()}`)
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(missing.status).toBe(404);
    const noLocation = await request(serverApp)
      .get(`/audit/events/${created.body.data.audit_event_id}`)
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(noLocation.body.error.code).toBe('LOCATION_ID_REQUIRED');
  });

  it('rejects gstn_password and stores a redacted credential edit', async () => {
    const serverApp = app();
    const forbidden = await ingest(
      serverApp,
      billBody({
        idempotency_key: 'secret-1',
        action: 'gstn_credential_edited',
        money_or_stock: false,
        after: { gstn_password: 'leak' },
        before: { updated: false },
      }),
    );
    expect(forbidden.status).toBe(400);
    expect(forbidden.body.error.code).toBe('SECRET_KEY_FORBIDDEN');
    const listed = await request(serverApp)
      .get('/audit/events')
      .query({ location_id: LOCAL_SEED_LOCATION_ID, action: 'gstn_credential_edited' })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(listed.body.data.items).toHaveLength(0);
    const ok = await ingest(
      serverApp,
      billBody({
        idempotency_key: 'secret-ok',
        action: 'gstn_credential_edited',
        money_or_stock: false,
        after: { updated: true, ref: 'secret-ref-1' },
        before: { updated: false },
      }),
    );
    expect(ok.status).toBe(201);
  });

  it('requires before/after for money or stock actions', async () => {
    const response = await ingest(app(), {
      ...billBody({ idempotency_key: 'grn-1', action: 'grn_posted', target_type: 'GRN' }),
      before: undefined,
      after: { qty: 1 },
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BEFORE_AFTER_REQUIRED');
  });

  it('requires money_or_stock for billed actions', async () => {
    const response = await ingest(
      app(),
      billBody({ money_or_stock: false, idempotency_key: 'flag' }),
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MONEY_OR_STOCK_REQUIRED');
  });

  it('stores HQ platform actions and scopes queries', async () => {
    const serverApp = app();
    const hq = await ingest(serverApp, {
      idempotency_key: 'admin:waba:rotate:2026-08-31',
      tenant_id: null,
      location_id: null,
      actor_user_id: 'hq-ops-1',
      actor_role: 'Ops',
      actor_surface: 'hq',
      action: 'admin_action',
      target_type: 'PlatformWaba',
      target_id: 'namma-medmate',
      money_or_stock: false,
      before: { rotated: false },
      after: { rotated: true },
    });
    expect(hq.status).toBe(201);
    await ingest(serverApp, billBody({ idempotency_key: 'shop-row' }));
    const platform = await request(serverApp)
      .get('/audit/events')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(platform.body.data.items).toHaveLength(1);
    expect(platform.body.data.items[0].action).toBe('admin_action');
    const pharmacy = await request(serverApp)
      .get('/audit/events')
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(pharmacy.body.data.items.every((row: { tenant_id: string }) => row.tenant_id)).toBe(
      true,
    );
    const shop = await request(serverApp)
      .get('/audit/events')
      .query({ tenant_id: LOCAL_SEED_TENANT_ID, location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(
      shop.body.data.items.every(
        (row: { tenant_id: string }) => row.tenant_id === LOCAL_SEED_TENANT_ID,
      ),
    ).toBe(true);
    const hqGet = await request(serverApp)
      .get(`/audit/events/${hq.body.data.audit_event_id}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(hqGet.status).toBe(200);
    const hqMissing = await request(serverApp)
      .get(`/audit/events/${crypto.randomUUID()}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(hqMissing.status).toBe(404);
  });

  it('rejects pharmacy ingest, missing actor, tenancy, range, and unknown action is stored', async () => {
    const serverApp = app();
    const pharmacyIngest = await request(serverApp)
      .post('/audit/events')
      .set('Authorization', `Bearer ${await pharmacyToken()}`)
      .send(billBody({ idempotency_key: 'pharm' }));
    expect(pharmacyIngest.status).toBe(403);
    const actor = await ingest(
      serverApp,
      billBody({ actor_user_id: '   ', idempotency_key: 'actor' }),
    );
    expect(actor.body.error.code).toBe('ACTOR_REQUIRED');
    const noLocation = await ingest(
      serverApp,
      billBody({ location_id: null, idempotency_key: 'no-loc' }),
    );
    expect(noLocation.body.error.code).toBe('LOCATION_ID_REQUIRED');
    const noTenant = await ingest(
      serverApp,
      billBody({ tenant_id: null, idempotency_key: 'no-ten' }),
    );
    expect(noTenant.status).toBe(400);
    const missingLoc = await ingest(
      serverApp,
      billBody({
        location_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        idempotency_key: 'missing-loc',
      }),
    );
    expect(missingLoc.status).toBe(404);
    const mismatch = await ingest(
      serverApp,
      billBody({
        tenant_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        location_id: LOCAL_SEED_LOCATION_ID,
        idempotency_key: 'mismatch',
      }),
    );
    expect(mismatch.status).toBe(403);
    const range = await request(serverApp)
      .get('/audit/events')
      .query({
        location_id: LOCAL_SEED_LOCATION_ID,
        from: '2026-08-31T12:00:00.000Z',
        to: '2026-08-01T12:00:00.000Z',
      })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(range.body.error.code).toBe('INVALID_RANGE');
    const unknown = await ingest(
      serverApp,
      billBody({
        idempotency_key: 'future-action',
        action: 'later_module_event',
        money_or_stock: false,
        before: undefined,
        after: undefined,
      }),
    );
    expect(unknown.status).toBe(201);
    const hqNeedsLocation = await request(serverApp)
      .get('/audit/events')
      .query({ tenant_id: LOCAL_SEED_TENANT_ID })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(hqNeedsLocation.body.error.code).toBe('LOCATION_ID_REQUIRED');
    const hqNeedsTenant = await request(serverApp)
      .get('/audit/events')
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(hqNeedsTenant.status).toBe(400);
    const badBody = await ingest(serverApp, { action: '' });
    expect(badBody.status).toBe(400);
    const oversized = await ingest(
      serverApp,
      billBody({
        idempotency_key: 'huge',
        after: { blob: 'x'.repeat(70_000) },
      }),
    );
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const filtered = await request(serverApp)
      .get('/audit/events')
      .query({
        location_id: LOCAL_SEED_LOCATION_ID,
        actor_user_id: 'user-111',
        target_type: 'Bill',
        cursor: '%%%',
        limit: 2,
      })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(filtered.status).toBe(200);
    const getBadId = await request(serverApp)
      .get('/audit/events/not-a-uuid')
      .query({ location_id: LOCAL_SEED_LOCATION_ID })
      .set('Authorization', `Bearer ${await pharmacyToken()}`);
    expect(getBadId.status).toBe(400);
  });

  it('covers controller branches for non-string query values', async () => {
    const events = createMemoryAuditRepository();
    const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
    const logger = {
      info: () => undefined,
      debug: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      child() {
        return this;
      },
    };
    const ingest = createIngestEventController(events, tenancy, logger);
    await expect(
      ingest({
        principal: { kind: 'service', sub: 'svc' },
        req: { body: undefined, query: {}, params: {} },
      } as never),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    const list = createListEventsController(events);
    await expect(
      list({
        principal: {
          kind: 'pharmacy',
          sub: 'u',
          tenantId: LOCAL_SEED_TENANT_ID,
          locationId: LOCAL_SEED_LOCATION_ID,
          role: 'pharmacist',
        },
        req: {
          query: {
            location_id: LOCAL_SEED_LOCATION_ID,
            actor_user_id: 1,
            target_type: 1,
            cursor: 1,
          },
          params: {},
          body: {},
        },
      } as never),
    ).resolves.toBeDefined();
    const get = createGetEventController(events);
    await expect(
      get({
        principal: {
          kind: 'pharmacy',
          sub: 'u',
          tenantId: LOCAL_SEED_TENANT_ID,
          locationId: LOCAL_SEED_LOCATION_ID,
          role: 'pharmacist',
        },
        req: { query: { location_id: LOCAL_SEED_LOCATION_ID }, params: {}, body: {} },
      } as never),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });

  it('resolves tenancy and query scope edges', async () => {
    const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
    await expect(
      resolveLocation(tenancy, LOCAL_SEED_TENANT_ID, LOCAL_SEED_LOCATION_ID),
    ).resolves.toBeDefined();
    await expect(
      resolveLocation(tenancy, LOCAL_SEED_TENANT_ID, crypto.randomUUID()),
    ).rejects.toMatchObject({
      code: ErrorCode.LOCATION_NOT_FOUND,
    });
    expect(
      resolveQueryScope({ kind: 'hq', sub: 'ops' }, LOCAL_SEED_TENANT_ID, LOCAL_SEED_LOCATION_ID),
    ).toMatchObject({ platformOnly: false });
    expect(resolveQueryScope({ kind: 'hq', sub: 'ops' }, undefined, undefined)).toMatchObject({
      platformOnly: true,
    });
  });
});
