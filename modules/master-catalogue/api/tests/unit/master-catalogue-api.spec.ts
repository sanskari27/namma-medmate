import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  createMemoryMasterCatalogueRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { createHttpAuditClient } from '../../src/audit/http-client.ts';
import { recordAdminAction } from '../../src/audit/record.ts';
import { principalFromSession, requireHq, requireReadable } from '../../src/auth/principal.ts';
import { loadMasterCatalogueEnv } from '../../src/config/env.ts';
import { MasterCatalogueErrors } from '../../src/errors.ts';
import { moneyToCents, normalizeMoney, parseMoney } from '../../src/http/money.ts';
import {
  effectiveRxOnly,
  parseAssertPriceBody,
  parseCeilingBody,
  parseCreateBody,
  parseGstSlab,
  parseLimit,
  parseOptionalBoolean,
  parseOptionalBooleanQuery,
  parseOptionalGstSlab,
  parseOptionalSchedule,
  parseOptionalString,
  parsePatchBody,
  parseSchedule,
  parseSkuId,
  parseSubstituteIds,
} from '../../src/http/validate.ts';
import { MemoryInventoryClient } from '../../src/inventory/client.ts';
import { localSeedPharmacy } from '../../src/local-seed.ts';

const CREATE = {
  name: 'Paracetamol 500mg',
  composition: 'Paracetamol 500mg',
  manufacturer: 'Example Labs',
  brand: 'Calpol',
  pack: '10 tablets',
  form: 'tablet',
  category: 'Fever',
  schedule: 'OTC',
  rx_only: false,
  hsn: '3004',
  gst_slab: 12,
  dpco_ceiling: '20.00',
};

describe('master-catalogue env', () => {
  it('loads defaults and coerced port', () => {
    const env = loadMasterCatalogueEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      MASTER_CATALOGUE_SERVICE_TOKEN: 'svc',
    });
    expect(env.MASTER_CATALOGUE_API_PORT).toBe(3005);
    const postgres = loadMasterCatalogueEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      MASTER_CATALOGUE_SERVICE_TOKEN: 'svc',
      MASTER_CATALOGUE_PERSISTENCE: 'postgres',
      MASTER_CATALOGUE_API_PORT: '4015',
      DATABASE_URL: 'postgres://namma:namma@127.0.0.1:5432/namma',
      AUDIT_API_BASE_URL: 'http://localhost:3004',
      AUDIT_SERVICE_TOKEN: 'audit',
    });
    expect(postgres.MASTER_CATALOGUE_API_PORT).toBe(4015);
    expect(postgres.MASTER_CATALOGUE_PERSISTENCE).toBe('postgres');
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/master-catalogue/api/src/app.ts',
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

describe('money helpers', () => {
  it('normalizes, rejects negatives, and treats 0 as a cap', () => {
    expect(normalizeMoney('20')).toBe('20.00');
    expect(normalizeMoney('20.5')).toBe('20.50');
    expect(moneyToCents('20.00')).toBe(2000);
    expect(moneyToCents('-1.00')).toBe(-100);
    expect(normalizeMoney('-1.00')).toBe('-1.00');
    expect(parseMoney('0.00', false)).toBe('0.00');
    expect(parseMoney(null, true)).toBeNull();
    expect(() => parseMoney(null, false)).toThrow();
    expect(() => parseMoney(-1, false)).toThrow();
    expect(() => parseMoney('-1.00', true)).toThrow(/ceiling/i);
    expect(() => parseMoney('-1.00', false)).toThrow(/negative/);
  });
});

describe('audit helpers', () => {
  it('swallows ingest failures and posts over HTTP', async () => {
    const failing = new MemoryAuditClient();
    failing.fail = true;
    const warn = vi.fn();
    await recordAdminAction(failing, { warn } as never, {
      actorUserId: 'ops',
      actorRole: 'Ops',
      targetId: 'sku',
      after: { banned: true },
      idempotencyKey: 'k',
    });
    expect(warn).toHaveBeenCalled();
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 201 }));
    vi.stubGlobal('fetch', fetchImpl);
    const http = createHttpAuditClient('http://audit.example', 'tok', {
      info: vi.fn(),
      warn: vi.fn(),
    } as never);
    await http.ingestAdminAction({
      actorUserId: 'ops',
      actorRole: 'Ops',
      targetId: 'sku',
      after: { created: true },
      idempotencyKey: 'k',
    });
    expect(fetchImpl).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('master-catalogue-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'mc-test';
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

  function env(overrides: Record<string, string | undefined> = {}) {
    return loadMasterCatalogueEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      MASTER_CATALOGUE_SERVICE_TOKEN: 'svc-token',
      LOG_LEVEL: 'error',
      ...overrides,
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'mc-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  async function hqToken() {
    return token({ sub: 'ops-1', principal_type: 'hq' });
  }

  async function pharmacyToken() {
    return token({
      sub: 'chemist-1',
      principal_type: 'pharmacy',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      role: 'cashier',
    });
  }

  function app(overrides?: {
    inventory?: MemoryInventoryClient;
    audit?: MemoryAuditClient;
    tenancy?: ReturnType<typeof createMemoryTenancyRepository>;
  }) {
    return createApp(env(), {
      catalogue: createMemoryMasterCatalogueRepository(),
      tenancy: overrides?.tenancy ?? createMemoryTenancyRepository(localSeedPharmacy()),
      inventory: overrides?.inventory ?? new MemoryInventoryClient(),
      audit: overrides?.audit ?? new MemoryAuditClient(),
    });
  }

  it('creates an OTC medicine, lists it, and asserts DPCO (US-1)', async () => {
    const hq = await hqToken();
    const pharmacy = await pharmacyToken();
    const instance = app();
    const created = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    expect(created.status).toBe(201);
    const listed = await request(instance)
      .get('/master-catalogue/skus')
      .query({ q: 'Paracetamol' })
      .set('authorization', `Bearer ${hq}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items[0].dpco_ceiling).toBe('20.00');
    const skuId = created.body.data.platform_master_sku_id as string;
    const above = await request(instance)
      .post(`/master-catalogue/skus/${skuId}/assert-price`)
      .set('authorization', `Bearer ${pharmacy}`)
      .send({ unit_price: '21.00' });
    expect(above.body.data.allowed).toBe(false);
    expect(above.body.data.reason_code).toBe('ABOVE_DPCO_CEILING');
    const ok = await request(instance)
      .post(`/master-catalogue/skus/${skuId}/assert-price`)
      .set('authorization', `Bearer ${pharmacy}`)
      .send({ unit_price: '20.00' });
    expect(ok.body.data.allowed).toBe(true);
  });

  it('bans, blocks assert-price, unbans without remapping (US-2)', async () => {
    const hq = await hqToken();
    const pharmacy = await pharmacyToken();
    const inventory = new MemoryInventoryClient();
    inventory.mappings.set('will-replace', [
      {
        tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
        locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      },
    ]);
    const instance = app({ inventory });
    const sku = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    const id = sku.body.data.platform_master_sku_id as string;
    inventory.mappings.set(id, inventory.mappings.get('will-replace') ?? []);
    const banned = await request(instance)
      .post(`/master-catalogue/skus/${id}/ban`)
      .set('authorization', `Bearer ${hq}`)
      .send({ reason: 'CDSCO ban' });
    expect(banned.status).toBe(200);
    expect(banned.body.data.banned).toBe(true);
    expect(inventory.unmapped).toContain(id);
    const asserted = await request(instance)
      .post(`/master-catalogue/skus/${id}/assert-price`)
      .set('authorization', `Bearer ${pharmacy}`)
      .send({ unit_price: '1.00' });
    expect(asserted.body.data.reason_code).toBe('BANNED_SKU');
    const unbanned = await request(instance)
      .post(`/master-catalogue/skus/${id}/unban`)
      .set('authorization', `Bearer ${hq}`);
    expect(unbanned.body.data.banned).toBe(false);
    expect(inventory.mappings.has(id)).toBe(false);
  });

  it('maintains substitutes and filters banned ones for POS (US-3)', async () => {
    const hq = await hqToken();
    const pharmacy = await pharmacyToken();
    const instance = app();
    const primary = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    const alt = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, name: 'Paracetamol 500mg Generic', brand: null });
    const id = primary.body.data.platform_master_sku_id as string;
    const altId = alt.body.data.platform_master_sku_id as string;
    const put = await request(instance)
      .put(`/master-catalogue/skus/${id}/substitutes`)
      .set('authorization', `Bearer ${hq}`)
      .send({ substitute_ids: [altId] });
    expect(put.status).toBe(200);
    const forPos = await request(instance)
      .get(`/master-catalogue/skus/${id}/substitutes`)
      .query({ for_pos: true })
      .set('authorization', `Bearer ${pharmacy}`);
    expect(forPos.body.data.items[0].platform_master_sku_id).toBe(altId);
    await request(instance)
      .post(`/master-catalogue/skus/${altId}/ban`)
      .set('authorization', `Bearer ${hq}`);
    const filtered = await request(instance)
      .get(`/master-catalogue/skus/${id}/substitutes`)
      .query({ for_pos: true })
      .set('authorization', `Bearer ${pharmacy}`);
    expect(filtered.body.data.items).toHaveLength(0);
    const self = await request(instance)
      .put(`/master-catalogue/skus/${id}/substitutes`)
      .set('authorization', `Bearer ${hq}`)
      .send({ substitute_ids: [id] });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects pharmacy writes and allows pharmacy reads (US-4)', async () => {
    const hq = await hqToken();
    const pharmacy = await pharmacyToken();
    const instance = app();
    const denied = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${pharmacy}`)
      .send(CREATE);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('HQ_ONLY');
    const created = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    const id = created.body.data.platform_master_sku_id as string;
    const read = await request(instance)
      .get(`/master-catalogue/skus/${id}`)
      .set('authorization', `Bearer ${pharmacy}`);
    expect(read.status).toBe(200);
    await request(instance)
      .post(`/master-catalogue/skus/${id}/ban`)
      .set('authorization', `Bearer ${hq}`);
    const bannedList = await request(instance)
      .get('/master-catalogue/skus')
      .query({ banned: true })
      .set('authorization', `Bearer ${hq}`);
    expect(bannedList.body.data.items.every((row: { banned: boolean }) => row.banned)).toBe(true);
  });

  it('validates gst, ceiling, schedule, and not-found', async () => {
    const hq = await hqToken();
    const instance = app();
    const gst = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, gst_slab: 7 });
    expect(gst.body.error.code).toBe('INVALID_GST_SLAB');
    const schedule = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, schedule: 'Z' });
    expect(schedule.body.error.code).toBe('VALIDATION_FAILED');
    const missing = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, name: '' });
    expect(missing.status).toBe(400);
    const created = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, dpco_ceiling: '0.00', schedule: 'H' });
    expect(created.body.data.rx_only).toBe(true);
    const id = created.body.data.platform_master_sku_id as string;
    const negative = await request(instance)
      .put(`/master-catalogue/skus/${id}/ceiling`)
      .set('authorization', `Bearer ${hq}`)
      .send({ dpco_ceiling: '-1.00' });
    expect(negative.body.error.code).toBe('INVALID_CEILING');
    const zero = await request(instance)
      .put(`/master-catalogue/skus/${id}/ceiling`)
      .set('authorization', `Bearer ${hq}`)
      .send({ dpco_ceiling: '0.00' });
    expect(zero.body.data.dpco_ceiling).toBe('0.00');
    const cleared = await request(instance)
      .put(`/master-catalogue/skus/${id}/ceiling`)
      .set('authorization', `Bearer ${hq}`)
      .send({ dpco_ceiling: null });
    expect(cleared.body.data.dpco_ceiling).toBeNull();
    const missingSku = await request(instance)
      .get(`/master-catalogue/skus/${crypto.randomUUID()}`)
      .set('authorization', `Bearer ${hq}`);
    expect(missingSku.body.error.code).toBe('NOT_FOUND');
  });

  it('patches fields, lists stocking pharmacies, and uses a service token', async () => {
    const hq = await hqToken();
    const inventory = new MemoryInventoryClient();
    inventory.failUnmap = true;
    const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
    const audit = new MemoryAuditClient();
    audit.fail = true;
    const instance = app({ inventory, tenancy, audit });
    const created = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    const id = created.body.data.platform_master_sku_id as string;
    inventory.mappings.set(id, [
      {
        tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
        locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      },
      {
        tenantId: crypto.randomUUID(),
        locationId: crypto.randomUUID(),
      },
    ]);
    const patched = await request(instance)
      .patch(`/master-catalogue/skus/${id}`)
      .set('authorization', `Bearer ${hq}`)
      .send({ category: 'Pain', manufacturer: null });
    expect(patched.body.data.category).toBe('Pain');
    const stocking = await request(instance)
      .get(`/master-catalogue/skus/${id}/stocking-pharmacies`)
      .set('authorization', `Bearer ${hq}`);
    expect(stocking.body.data.items).toHaveLength(1);
    expect(stocking.body.data.items[0].display_name).toBe('Sri Krishna Medicals');
    const emptySku = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, name: 'Ibuprofen' });
    const emptyStocking = await request(instance)
      .get(
        `/master-catalogue/skus/${emptySku.body.data.platform_master_sku_id}/stocking-pharmacies`,
      )
      .set('authorization', `Bearer ${hq}`);
    expect(emptyStocking.status).toBe(200);
    expect(emptyStocking.body.data.items).toHaveLength(0);
    await request(instance)
      .post(`/master-catalogue/skus/${id}/ban`)
      .set('authorization', `Bearer ${hq}`);
    const serviceRead = await request(instance)
      .get(`/master-catalogue/skus/${id}`)
      .set('authorization', 'Bearer svc-token');
    expect(serviceRead.status).toBe(200);
    const scheduled = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, name: 'Alprazolam', schedule: 'X', rx_only: false });
    expect(scheduled.body.data.rx_only).toBe(true);
    await request(instance)
      .patch(`/master-catalogue/skus/${scheduled.body.data.platform_master_sku_id}`)
      .set('authorization', `Bearer ${hq}`)
      .send({ schedule: 'OTC', rx_only: true });
  });

  it('wires an HTTP audit client when AUDIT_API_BASE_URL is set', () => {
    const wired = createApp(
      env({ AUDIT_API_BASE_URL: 'http://127.0.0.1:3999', AUDIT_SERVICE_TOKEN: 'a' }),
    );
    expect(wired).toBeDefined();
  });

  it('rejects unauthorized, invalid filters, unknown substitutes, and duplicates', async () => {
    const hq = await hqToken();
    const instance = app();
    const noAuth = await request(instance).get('/master-catalogue/skus');
    expect(noAuth.status).toBe(401);
    const created = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send(CREATE);
    const id = created.body.data.platform_master_sku_id as string;
    const badLimit = await request(instance)
      .get('/master-catalogue/skus')
      .query({ limit: 'nope' })
      .set('authorization', `Bearer ${hq}`);
    expect(badLimit.status).toBe(400);
    const badBool = await request(instance)
      .get('/master-catalogue/skus')
      .query({ banned: 'maybe' })
      .set('authorization', `Bearer ${hq}`);
    expect(badBool.status).toBe(400);
    const unknown = await request(instance)
      .put(`/master-catalogue/skus/${id}/substitutes`)
      .set('authorization', `Bearer ${hq}`)
      .send({ substitute_ids: [crypto.randomUUID()] });
    expect(unknown.status).toBe(400);
    const alt = await request(instance)
      .post('/master-catalogue/skus')
      .set('authorization', `Bearer ${hq}`)
      .send({ ...CREATE, name: 'Other' });
    const altId = alt.body.data.platform_master_sku_id as string;
    const dup = await request(instance)
      .put(`/master-catalogue/skus/${id}/substitutes`)
      .set('authorization', `Bearer ${hq}`)
      .send({ substitute_ids: [altId, altId] });
    expect(dup.status).toBe(400);
    await request(instance)
      .post(`/master-catalogue/skus/${altId}/ban`)
      .set('authorization', `Bearer ${hq}`);
    const bannedSub = await request(instance)
      .put(`/master-catalogue/skus/${id}/substitutes`)
      .set('authorization', `Bearer ${hq}`)
      .send({ substitute_ids: [altId] });
    expect(bannedSub.status).toBe(400);
    await request(instance)
      .post(`/master-catalogue/skus/${id}/ban`)
      .set('authorization', `Bearer ${hq}`)
      .send({ reason: null });
    const missingCeiling = await request(instance)
      .put(`/master-catalogue/skus/${id}/ceiling`)
      .set('authorization', `Bearer ${hq}`)
      .send({});
    expect(missingCeiling.status).toBe(400);
    const missingPrice = await request(instance)
      .post(`/master-catalogue/skus/${id}/assert-price`)
      .set('authorization', `Bearer ${hq}`)
      .send({});
    expect(missingPrice.status).toBe(400);
    const badId = await request(instance)
      .get('/master-catalogue/skus/not-a-uuid')
      .set('authorization', `Bearer ${hq}`);
    expect(badId.status).toBe(400);
    const pharmacyList = await request(instance)
      .get('/master-catalogue/skus')
      .set('authorization', `Bearer ${await pharmacyToken()}`);
    expect(pharmacyList.status).toBe(403);
    expect(createApp(env())).toBeDefined();
    const incomplete = await token({ sub: 'x', principal_type: 'pharmacy', tenant_id: 't' });
    const forbiddenRead = await request(instance)
      .get(`/master-catalogue/skus/${id}`)
      .set('authorization', `Bearer ${incomplete}`);
    expect(forbiddenRead.status).toBe(403);
  });
});

describe('validators and auth helpers', () => {
  it('covers parse helpers and principal guards', () => {
    expect(parseLimit(undefined)).toBe(50);
    expect(parseLimit('')).toBe(50);
    expect(parseLimit('300')).toBe(200);
    expect(() => parseLimit('nope')).toThrow();
    expect(parseOptionalString(undefined)).toBeUndefined();
    expect(parseOptionalString('')).toBeUndefined();
    expect(parseOptionalString('Fever')).toBe('Fever');
    expect(() => parseOptionalString(1)).toThrow();
    expect(parseOptionalBoolean(undefined)).toBeUndefined();
    expect(parseOptionalBoolean('')).toBeUndefined();
    expect(parseOptionalBoolean(true)).toBe(true);
    expect(parseOptionalBoolean(false)).toBe(false);
    expect(parseOptionalBoolean('false')).toBe(false);
    expect(parseOptionalBooleanQuery('true')).toBe(true);
    expect(parseOptionalBooleanQuery(undefined)).toBe(false);
    expect(parseOptionalSchedule(undefined)).toBeUndefined();
    expect(parseOptionalSchedule('')).toBeUndefined();
    expect(parseOptionalSchedule('OTC')).toBe('OTC');
    expect(() => parseSchedule(1)).toThrow();
    expect(parseOptionalGstSlab(undefined)).toBeUndefined();
    expect(parseOptionalGstSlab('')).toBeUndefined();
    expect(parseOptionalGstSlab('12')).toBe(12);
    expect(() => parseGstSlab('x')).toThrow();
    expect(effectiveRxOnly('H1', false)).toBe(true);
    expect(effectiveRxOnly('OTC', undefined)).toBe(false);
    expect(
      parseCreateBody({
        name: 'N',
        composition: 'C',
        category: 'Fever',
        schedule: 'OTC',
        hsn: '3004',
        gst_slab: 12,
      }).dpcoCeiling,
    ).toBeNull();
    expect(() => parseCreateBody({})).toThrow();
    expect(() => parseCreateBody(undefined)).toThrow();
    expect(parsePatchBody({}).name).toBeUndefined();
    expect(parsePatchBody(undefined).name).toBeUndefined();
    expect(() => parsePatchBody({ gst_slab: 'x' })).toThrow();
    expect(parsePatchBody({ gst_slab: 12, schedule: 'H' }).gstSlab).toBe(12);
    expect(
      parseCreateBody({
        name: 'N',
        composition: 'C',
        category: 'Fever',
        schedule: 'OTC',
        hsn: '3004',
        gst_slab: 12,
        dpco_ceiling: null,
      }).dpcoCeiling,
    ).toBeNull();
    expect(() => parseCeilingBody(null)).toThrow();
    expect(() => parseAssertPriceBody(null)).toThrow();
    expect(() => parseAssertPriceBody({ unit_price: null })).toThrow();
    expect(parseAssertPriceBody({ unit_price: '1.00' })).toBe('1.00');
    expect(() => parseSubstituteIds({}, crypto.randomUUID())).toThrow();
    expect(() => parseSubstituteIds(undefined, crypto.randomUUID())).toThrow();
    expect(() => parseSkuId({})).toThrow();
    expect(() => parseSkuId({ platform_master_sku_id: 'nope' })).toThrow();
    expect(() => parseOptionalBoolean('maybe')).toThrow();
    expect(() => requireHq(undefined)).toThrow();
    expect(() => requireReadable(undefined)).toThrow();
    expect(requireReadable({ kind: 'service', sub: 's' }).kind).toBe('service');
    expect(MasterCatalogueErrors.forbidden().code).toBe('FORBIDDEN');
  });

  it('returns not-found when writes vanish after load', async () => {
    const inner = createMemoryMasterCatalogueRepository();
    const catalogue = {
      ...inner,
      createSku: inner.createSku.bind(inner),
      getById: inner.getById.bind(inner),
      getByIds: inner.getByIds.bind(inner),
      listSkus: inner.listSkus.bind(inner),
      listSubstitutes: inner.listSubstitutes.bind(inner),
      replaceSubstitutes: inner.replaceSubstitutes.bind(inner),
      updateSku: async () => undefined,
      setCeiling: async () => undefined,
      ban: async () => undefined,
      unban: async () => undefined,
    };
    const created = await inner.createSku({
      name: 'N',
      composition: 'C',
      category: 'Fever',
      schedule: 'OTC',
      rxOnly: false,
      hsn: '3004',
      gstSlab: 12,
    });
    const keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'vanish';
    jwk.alg = 'RS256';
    const server = createServer((req, res) => {
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
    const issuer = `http://127.0.0.1:${address.port}`;
    const env = loadMasterCatalogueEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: `${issuer}/jwks.json`,
      MASTER_CATALOGUE_SERVICE_TOKEN: 'svc-token',
      LOG_LEVEL: 'error',
    });
    const hq = await new SignJWT({ sub: 'ops-1', principal_type: 'hq' })
      .setProtectedHeader({ alg: 'RS256', kid: 'vanish' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
    const app = createApp(env, { catalogue });
    const id = created.platformMasterSkuId;
    await expect(
      request(app).patch(`/master-catalogue/skus/${id}`).set('authorization', `Bearer ${hq}`).send({
        category: 'Pain',
      }),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      request(app)
        .put(`/master-catalogue/skus/${id}/ceiling`)
        .set('authorization', `Bearer ${hq}`)
        .send({ dpco_ceiling: '1.00' }),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      request(app).post(`/master-catalogue/skus/${id}/ban`).set('authorization', `Bearer ${hq}`),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      request(app).post(`/master-catalogue/skus/${id}/unban`).set('authorization', `Bearer ${hq}`),
    ).resolves.toMatchObject({ status: 404 });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
