import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createMemoryTenancyRepository } from '@namma-medmate/db-services';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { loadTenancyEnv } from '../../src/config/env.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import { createCreatePharmacyController } from '../../src/controllers/create-pharmacy.controller.ts';
import { createGetLocationController } from '../../src/controllers/get-location.controller.ts';
import { createListPharmaciesController } from '../../src/controllers/list-pharmacies.controller.ts';
import { createPatchCurrentController } from '../../src/controllers/patch-current.controller.ts';
import { requireMatchingLocation } from '../../src/controllers/get-current.controller.ts';

const DISPLAY = 'Sri Krishna Medicals';

describe('tenancy env', () => {
  it('loads required oidc settings and defaults the port', () => {
    const env = loadTenancyEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
    });
    expect(env.TENANCY_API_PORT).toBe(3002);
    expect(env.TENANCY_PERSISTENCE).toBe('memory');
  });

  it('accepts postgres persistence and a coerced port', () => {
    const env = loadTenancyEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      TENANCY_PERSISTENCE: 'postgres',
      TENANCY_API_PORT: '4010',
      DATABASE_URL: 'postgres://namma:namma@127.0.0.1:5432/namma',
    });
    expect(env.TENANCY_PERSISTENCE).toBe('postgres');
    expect(env.TENANCY_API_PORT).toBe(4010);
    expect(env.DATABASE_URL).toContain('5432');
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/tenancy/api/src/app.ts',
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

describe('tenancy-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'tenancy-test';
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
    return loadTenancyEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'tenancy-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  function app() {
    return createApp(env(), createMemoryTenancyRepository());
  }

  async function hqToken() {
    return token({ sub: 'ops-1', principal_type: 'hq' });
  }

  async function pharmacyToken(overrides?: Record<string, unknown>) {
    return token({
      sub: 'chemist-1',
      principal_type: 'pharmacy',
      tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
      location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
      role: 'owner',
      ...overrides,
    });
  }

  async function createPharmacy(serverApp: ReturnType<typeof createApp>, displayName = DISPLAY) {
    const response = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`)
      .send({
        display_name: displayName,
        gst_dealer_type: 'regular',
        business_type: 'retail',
      });
    return response;
  }

  it('auto-mounts /health', async () => {
    const response = await request(app()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('creates a pharmacy with both ids and returns it on GET', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    expect(created.status).toBe(201);
    expect(created.body.data.tenant_id).toBeTruthy();
    expect(created.body.data.location_id).toBeTruthy();
    expect(created.body.data).not.toHaveProperty('user_id');
    const got = await request(serverApp)
      .get(`/tenancy/pharmacies/${created.body.data.tenant_id}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(got.status).toBe(200);
    expect(got.body.data.location.tenant_id).toBe(created.body.data.tenant_id);
    expect(got.body.data.location.location_id).toBe(created.body.data.location_id);
  });

  it('rejects composition or wholesale creates without writing a row', async () => {
    const serverApp = app();
    const composition = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`)
      .send({
        display_name: DISPLAY,
        gst_dealer_type: 'composition',
        business_type: 'retail',
      });
    expect(composition.status).toBe(400);
    expect(composition.body.error.code).toBe('VALIDATION_FAILED');
    const wholesale = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`)
      .send({
        display_name: DISPLAY,
        gst_dealer_type: 'regular',
        business_type: 'wholesale',
      });
    expect(wholesale.status).toBe(400);
    const listed = await request(serverApp)
      .get('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(listed.body.data.items).toEqual([]);
  });

  it('rejects empty, whitespace, and oversized display names', async () => {
    const serverApp = app();
    const empty = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`)
      .send({ display_name: '   ', gst_dealer_type: 'regular', business_type: 'retail' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.i18n_key).toBe('tenancy.errors.displayNameRequired');
    const long = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${await hqToken()}`)
      .send({
        display_name: 'x'.repeat(121),
        gst_dealer_type: 'regular',
        business_type: 'retail',
      });
    expect(long.status).toBe(400);
  });

  it('lists pharmacies with a cursor and ignores a tampered cursor', async () => {
    const serverApp = app();
    await createPharmacy(serverApp, 'One');
    await createPharmacy(serverApp, 'Two');
    const page = await request(serverApp)
      .get('/tenancy/pharmacies')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(page.body.data.items).toHaveLength(1);
    expect(page.body.data.next_cursor).toBeTruthy();
    const next = await request(serverApp)
      .get('/tenancy/pharmacies')
      .query({ limit: 1, cursor: page.body.data.next_cursor })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(next.body.data.items).toHaveLength(1);
    const tampered = await request(serverApp)
      .get('/tenancy/pharmacies')
      .query({ limit: 50, cursor: '%%%' })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(tampered.body.data.items.length).toBe(2);
  });

  it('returns 409 LOCATION_LIMIT_V1 for a second location and 404 when unknown', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const second = await request(serverApp)
      .post(`/tenancy/pharmacies/${created.body.data.tenant_id}/locations`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('LOCATION_LIMIT_V1');
    const missing = await request(serverApp)
      .post('/tenancy/pharmacies/8f1c0a7e-2b3d-4e5f-8a90-123456789abc/locations')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('PHARMACY_NOT_FOUND');
  });

  it('rejects malformed tenant ids and missing pharmacies', async () => {
    const serverApp = app();
    const bad = await request(serverApp)
      .get('/tenancy/pharmacies/not-a-uuid')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_FAILED');
    const missing = await request(serverApp)
      .get('/tenancy/pharmacies/8f1c0a7e-2b3d-4e5f-8a90-123456789abc')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(missing.status).toBe(404);
  });

  it('forbids pharmacy users from HQ routes and HQ from /current', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const pharmacist = await pharmacyToken({
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'pharmacist',
    });
    const hqCreate = await request(serverApp)
      .post('/tenancy/pharmacies')
      .set('Authorization', `Bearer ${pharmacist}`)
      .send({
        display_name: DISPLAY,
        gst_dealer_type: 'regular',
        business_type: 'retail',
      });
    expect(hqCreate.status).toBe(403);
    expect(hqCreate.body.error.code).toBe('HQ_ONLY');
    const current = await request(serverApp)
      .get('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(current.status).toBe(403);
    expect(current.body.error.code).toBe('PHARMACY_SESSION_REQUIRED');
  });

  it('requires location_id on current and rejects another tenant location', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const other = await createPharmacy(serverApp, 'Other');
    const owner = await pharmacyToken({
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'owner',
    });
    const missing = await request(serverApp)
      .get('/tenancy/current')
      .set('Authorization', `Bearer ${owner}`);
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('LOCATION_ID_REQUIRED');
    const mismatch = await request(serverApp)
      .get('/tenancy/current')
      .query({ location_id: other.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`);
    expect(mismatch.status).toBe(403);
    expect(mismatch.body.error.code).toBe('LOCATION_TENANT_MISMATCH');
    expect(JSON.stringify(mismatch.body)).not.toContain('Other');
    const ok = await request(serverApp)
      .get('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.location.location_id).toBe(created.body.data.location_id);
  });

  it('lets Owner rename the shop and forbids Cashier', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const owner = await pharmacyToken({
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'owner',
    });
    const cashier = await pharmacyToken({
      sub: 'cashier-1',
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'cashier',
    });
    const denied = await request(serverApp)
      .patch('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${cashier}`)
      .send({
        location_id: created.body.data.location_id,
        display_name: 'New Board',
      });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN_ROLE');
    const renamed = await request(serverApp)
      .patch('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`)
      .send({
        location_id: created.body.data.location_id,
        display_name: 'Sri Krishna Medicals Indiranagar',
      });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.location.display_name).toBe('Sri Krishna Medicals Indiranagar');
    const resolved = await request(serverApp)
      .get(`/tenancy/locations/${created.body.data.location_id}`)
      .query({ tenant_id: created.body.data.tenant_id })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(resolved.body.data.display_name).toBe('Sri Krishna Medicals Indiranagar');
    const bodyMismatch = await request(serverApp)
      .patch('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`)
      .send({
        location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
        display_name: 'Nope',
      });
    expect(bodyMismatch.status).toBe(403);
  });

  it('resolves locations for matching pharmacy sessions and hides unknown ids', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const owner = await pharmacyToken({
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'owner',
    });
    const ok = await request(serverApp)
      .get(`/tenancy/locations/${created.body.data.location_id}`)
      .query({ tenant_id: created.body.data.tenant_id })
      .set('Authorization', `Bearer ${owner}`);
    expect(ok.status).toBe(200);
    const foreign = await request(serverApp)
      .get('/tenancy/locations/1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809')
      .query({ tenant_id: created.body.data.tenant_id })
      .set('Authorization', `Bearer ${owner}`);
    expect(foreign.status).toBe(403);
    const missing = await request(serverApp)
      .get('/tenancy/locations/1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809')
      .query({ tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc' })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('LOCATION_NOT_FOUND');
    const pairing = await request(serverApp)
      .get(`/tenancy/locations/${created.body.data.location_id}`)
      .query({ tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc' })
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(pairing.status).toBe(403);
    expect(JSON.stringify(pairing.body)).not.toContain(DISPLAY);
    const noPrincipal = await request(serverApp)
      .get(`/tenancy/locations/${created.body.data.location_id}`)
      .query({ tenant_id: created.body.data.tenant_id })
      .set('Authorization', `Bearer ${await token({ sub: 'bare' })}`);
    expect(noPrincipal.status).toBe(403);
    const missingTenant = await request(serverApp)
      .get(`/tenancy/locations/${created.body.data.location_id}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(missingTenant.status).toBe(400);
  });

  it('returns 401 without a bearer token', async () => {
    const response = await request(app()).get('/tenancy/pharmacies');
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 404 current when the session pharmacy was not persisted', async () => {
    const owner = await pharmacyToken();
    const response = await request(app())
      .get('/tenancy/current')
      .query({ location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809' })
      .set('Authorization', `Bearer ${owner}`);
    expect(response.status).toBe(404);
  });

  it('uses the default in-memory repository when none is injected', async () => {
    const response = await request(createApp(env())).get('/health');
    expect(response.status).toBe(200);
  });

  it('rejects an empty location_id and a non-string patch body location', async () => {
    const serverApp = app();
    const created = await createPharmacy(serverApp);
    const owner = await pharmacyToken({
      tenant_id: created.body.data.tenant_id,
      location_id: created.body.data.location_id,
      role: 'owner',
    });
    const empty = await request(serverApp)
      .get('/tenancy/current')
      .query({ location_id: '' })
      .set('Authorization', `Bearer ${owner}`);
    expect(empty.status).toBe(400);
    const missingBodyLocation = await request(serverApp)
      .patch('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`)
      .send({ display_name: 'Board' });
    expect(missingBodyLocation.status).toBe(400);
    const numericName = await request(serverApp)
      .patch('/tenancy/current')
      .query({ location_id: created.body.data.location_id })
      .set('Authorization', `Bearer ${owner}`)
      .send({
        location_id: created.body.data.location_id,
        display_name: 12,
      });
    expect(numericName.status).toBeGreaterThanOrEqual(400);
  });
});

describe('tenancy controllers without OpenAPI', () => {
  it('falls back to a default page size and ignores a non-string cursor', async () => {
    const repository = createMemoryTenancyRepository();
    await repository.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: 'regular',
      businessType: 'retail',
    });
    const list = createListPharmaciesController(repository);
    const hq = { kind: 'hq' as const, sub: 'ops' };
    const session = { sub: 'ops', issuer: 'iss', audience: 'aud' };
    const fallback = await list({
      principal: hq,
      session,
      req: { query: { limit: 'nope', cursor: ['x'] }, params: {}, body: undefined },
    } as never);
    expect(fallback.data.items).toHaveLength(1);
    const omitted = await list({
      principal: hq,
      session,
      req: { query: {}, params: {}, body: undefined },
    } as never);
    expect(omitted.data.items).toHaveLength(1);
  });

  it('treats a missing create body as empty and rejects a missing display name', async () => {
    const create = createCreatePharmacyController(createMemoryTenancyRepository(), {
      info: () => undefined,
    } as never);
    await expect(
      create({
        principal: { kind: 'hq', sub: 'ops' },
        session: { sub: 'ops', issuer: 'iss', audience: 'aud' },
        req: { query: {}, params: {}, body: undefined },
      } as never),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('parses tenant_id from a non-string query as a UUID failure', async () => {
    const getLocation = createGetLocationController(createMemoryTenancyRepository());
    await expect(
      getLocation({
        principal: { kind: 'hq', sub: 'ops' },
        session: { sub: 'ops', issuer: 'iss', audience: 'aud' },
        req: {
          query: { tenant_id: ['not-a-uuid'] },
          params: { location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809' },
          body: undefined,
        },
      } as never),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('rejects a missing patch body and a non-string current location query', async () => {
    const repository = createMemoryTenancyRepository();
    const created = await repository.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: 'regular',
      businessType: 'retail',
    });
    const principal = {
      kind: 'pharmacy' as const,
      sub: 'owner-1',
      tenantId: created.tenantId,
      locationId: created.location.locationId,
      role: 'owner' as const,
    };
    const session = { sub: 'owner-1', issuer: 'iss', audience: 'aud' };
    const patch = createPatchCurrentController(repository, { info: () => undefined } as never);
    await expect(
      patch({
        principal,
        session,
        req: {
          query: { location_id: created.location.locationId },
          params: {},
          body: undefined,
        },
      } as never),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(() =>
      requireMatchingLocation({
        principal,
        session,
        req: { query: { location_id: ['x'] }, params: {}, body: undefined },
      } as never),
    ).toThrowError();
  });
});
