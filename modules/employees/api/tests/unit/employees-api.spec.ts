import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  createMemoryAuthRepository,
  createMemoryEmployeesRepository,
  createMemoryTenancyRepository,
  type AuthRepository,
} from '@namma-medmate/db-services';
import { MemoryStorageClient } from '@namma-medmate/storage-client';
import { createApp, resolveApiSpecPath, type EmployeesDeps } from '../../src/app.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { createHttpAuditClient } from '../../src/audit/http-client.ts';
import { recordAudit } from '../../src/audit/record.ts';
import { loadEmployeesEnv } from '../../src/config/env.ts';
import {
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
  localSeedPharmacy,
} from '../../src/local-seed.ts';
import { allPermissionsTrue, canManageEmployees } from '../../src/permissions.ts';
import { MemoryPlanGatingClient } from '../../src/plan-gating/client.ts';
import { createHttpPlanGatingClient } from '../../src/plan-gating/http-client.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import { csvEscape, maskAadhaar } from '../../src/http/mappers.ts';
import { buildIdCardPdf } from '../../src/id-card.ts';

const OTHER_LOCATION = '9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210';
const CASHIER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PII_KEY = 'unit-employees-pii-key';

const pharmacistBody = {
  full_name: 'Anita Sharma',
  phone: '+919812345678',
  position: 'pharmacist',
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
};

describe('employees env', () => {
  it('defaults the port', () => {
    const env = loadEmployeesEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      EMPLOYEES_PII_KEY: PII_KEY,
    });
    expect(env.EMPLOYEES_API_PORT).toBe(3008);
  });

  it('accepts a coerced port', () => {
    const env = loadEmployeesEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      EMPLOYEES_API_PORT: '4012',
      EMPLOYEES_PII_KEY: PII_KEY,
    });
    expect(env.EMPLOYEES_API_PORT).toBe(4012);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/employees/api/src/app.ts',
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
    ).toMatchObject({ kind: 'pharmacy' });
  });

  it('masks Aadhaar and escapes CSV', () => {
    expect(maskAadhaar('123412341234')).toBe('XXXX-XXXX-1234');
    expect(maskAadhaar('12')).toBe('XXXX-XXXX-XXXX');
    expect(maskAadhaar(null)).toBeNull();
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('plain')).toBe('plain');
    expect(canManageEmployees('cashier', { employees: false })).toBe(false);
    expect(canManageEmployees('owner', {})).toBe(true);
  });

  it('builds an ID card without PAN or Aadhaar', async () => {
    const bytes = await buildIdCardPdf({
      shopName: 'Sri Krishna Medicals',
      fullName: 'Anita Sharma',
      position: 'Pharmacist',
      employeeCode: 'EMP-0001',
      city: 'Bengaluru',
    });
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).toContain('Anita Sharma');
    expect(text).not.toContain('ABCDE1234F');
    expect(text).not.toContain('123412341234');
  });
});

describe('clients', () => {
  it('forwards audit ingest over HTTP', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchImpl);
    const client = createHttpAuditClient('http://audit.local', 'token');
    await client.ingest({
      action: 'employee.created',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      targetId: 'e1',
      idempotencyKey: 'k',
    });
    expect(fetchImpl).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('reads module entitlements from plan-gating', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { effective_plan: 'starter', modules: { employees: true } } }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchImpl);
    await expect(
      createHttpPlanGatingClient('http://plan.local/').getEntitlements(
        'tok',
        LOCAL_SEED_LOCATION_ID,
      ),
    ).resolves.toMatchObject({ plan: 'starter' });
    vi.unstubAllGlobals();
  });

  it('falls back to Free when entitlements omit the plan', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchImpl);
    await expect(
      createHttpPlanGatingClient('http://plan.local').getEntitlements(
        'tok',
        LOCAL_SEED_LOCATION_ID,
      ),
    ).resolves.toEqual({ plan: 'free', modules: {} });
    vi.unstubAllGlobals();
  });

  it('swallows audit ingest failures', async () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const audit = new MemoryAuditClient();
    audit.fail = true;
    await recordAudit(audit, logger as never, {
      action: 'employee.created',
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      actorUserId: LOCAL_SEED_OWNER_ID,
      actorRole: 'owner',
      targetId: 'e1',
      idempotencyKey: 'k',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('wires HTTP plan-gating and audit clients from env', () => {
    expect(
      createApp(
        loadEmployeesEnv({
          OIDC_ISSUER: 'http://localhost:8081',
          OIDC_AUDIENCE: 'namma-medmate-dispensary',
          OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
          EMPLOYEES_PII_KEY: PII_KEY,
          PLAN_GATING_API_BASE_URL: 'http://plan.local',
          AUDIT_API_BASE_URL: 'http://audit.local',
          AUDIT_SERVICE_TOKEN: 'svc',
        }),
      ),
    ).toBeTruthy();
  });
});

describe('employees-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'employees-test';
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
    return loadEmployeesEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
      EMPLOYEES_PII_KEY: PII_KEY,
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'employees-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  async function ownerToken() {
    return token({
      sub: LOCAL_SEED_OWNER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'owner',
    });
  }

  async function cashierToken() {
    return token({
      sub: CASHIER_ID,
      principal_type: 'pharmacy',
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      role: 'cashier',
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

  async function wired(overrides?: EmployeesDeps) {
    const auth = overrides?.auth ?? createMemoryAuthRepository();
    if (!overrides?.auth) {
      await seedOwner(auth);
    }
    const planGating = overrides?.planGating ?? new MemoryPlanGatingClient();
    const audit = (overrides?.audit as MemoryAuditClient | undefined) ?? new MemoryAuditClient();
    const employees = overrides?.employees ?? createMemoryEmployeesRepository();
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
        storage: new MemoryStorageClient(),
        piiKey: PII_KEY,
        ...overrides,
      }),
    };
  }

  it('US-1 creates a registered pharmacist and grows composition', async () => {
    const { app } = await wired();
    const headers = { authorization: `Bearer ${await ownerToken()}` };
    const created = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send(pharmacistBody);
    expect(created.status).toBe(201);
    expect(created.body.data.employee_code).toBe('EMP-0001');
    expect(created.body.data.pharmacist_eligible).toBe(true);
    const summary = await request(app)
      .get(`/employees/summary?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(
      summary.body.data.composition.find(
        (row: { position: string }) => row.position === 'pharmacist',
      ).count,
    ).toBe(1);
    const eligible = await request(app)
      .get(`/employees/pharmacist-eligible?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(eligible.body.data.items[0].pharmacist_registration_no).toBe('KA-12345');
    expect(eligible.body.data.items[0].pan).toBeUndefined();
    const incomplete = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        full_name: 'No Expiry',
        phone: '+919800000000',
        position: 'pharmacist',
        pharmacist_registration_no: 'KA-9',
      });
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.code).toBe('PHARMACIST_REG_INCOMPLETE');
  });

  it('US-2 exports CSV, ID card, and keeps login when separated', async () => {
    const { app, auth } = await wired();
    await auth.createUser({
      userId: USER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'anita.login',
      role: 'pharmacist',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: { employees: false },
    });
    const headers = { authorization: `Bearer ${await ownerToken()}` };
    const created = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        ...pharmacistBody,
        aadhaar: '123412341234',
        pan: 'ABCDE1234F',
        bank_account_number: '1234567890',
        bank_ifsc: 'HDFC0001234',
        bank_upi_id: 'anita@hdfc',
        user_id: USER_ID,
        email: 'anita@example.com',
      });
    const employeeId = created.body.data.employee_id as string;
    const csv = await request(app)
      .get(`/employees/export.csv?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.startsWith('\uFEFF')).toBe(true);
    expect(csv.text).toContain('XXXX-XXXX-1234');
    expect(csv.text).toContain('ABCDE1234F');
    expect(csv.text).not.toContain('1234567890');
    const pdf = await request(app)
      .get(`/employees/${employeeId}/id-card.pdf?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(pdf.headers['content-type']).toMatch(/pdf/);
    const pdfText = pdf.body.toString('latin1');
    expect(pdfText).toContain('Anita Sharma');
    expect(pdfText).not.toContain('ABCDE1234F');
    expect(pdfText).not.toContain('123412341234');
    const separated = await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ status: 'separated' });
    expect(separated.body.data.status).toBe('separated');
    const listed = await request(app)
      .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&status=separated`)
      .set(headers);
    expect(listed.body.data.total).toBe(1);
    const eligible = await request(app)
      .get(`/employees/pharmacist-eligible?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(eligible.body.data.items).toHaveLength(0);
    const user = await auth.findUserById(USER_ID);
    expect(user?.active).toBe(true);
    const summary = await request(app)
      .get(`/employees/summary?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(summary.body.data.headcount.active).toBe(0);
    expect(summary.body.data.headcount.separated).toBe(1);
  });

  it('US-3 Free plan and cashier cannot mutate', async () => {
    const free = new MemoryPlanGatingClient();
    free.plan = 'free';
    free.modules = { employees: false };
    const { app, auth } = await wired({ planGating: free });
    await auth.createUser({
      userId: CASHIER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'ravi.cashier',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: { employees: false },
    });
    const locked = await request(app)
      .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe('PLAN_REQUIRED');
    expect(locked.body.error.details.required_plan).toBe('starter');
    expect(locked.body.data).toBeUndefined();
    const starter = await wired();
    await starter.auth.createUser({
      userId: CASHIER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'ravi.cashier',
      role: 'cashier',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: { employees: false },
    });
    const forbidden = await request(starter.app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await cashierToken()}`)
      .send(pharmacistBody);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  it('covers location, codes, links, uploads, and 405', async () => {
    const { app, auth } = await wired();
    await auth.createUser({
      userId: USER_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'linked.user',
      role: 'pharmacist',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: {},
    });
    const headers = { authorization: `Bearer ${await ownerToken()}` };
    expect((await request(app).get('/employees/summary').set(headers)).body.error.code).toBe(
      'LOCATION_REQUIRED',
    );
    const first = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .set('idempotency-key', 'create-1')
      .send({ ...pharmacistBody, employee_code: 'EMP-0001', aadhaar: '99' });
    expect(first.status).toBe(201);
    const replay = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .set('idempotency-key', 'create-1')
      .send({ ...pharmacistBody, employee_code: 'EMP-0001', aadhaar: '99' });
    expect(replay.body.data.employee_id).toBe(first.body.data.employee_id);
    const conflict = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .set('idempotency-key', 'create-1')
      .send({ ...pharmacistBody, full_name: 'Other' });
    expect(conflict.status).toBe(409);
    const dup = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ ...pharmacistBody, employee_code: 'EMP-0001', full_name: 'Dup' });
    expect(dup.body.error.code).toBe('EMPLOYEE_CODE_TAKEN');
    const employeeId = first.body.data.employee_id as string;
    const linked = await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ user_id: USER_ID, full_name: 'Anita "Q" Sharma, RPh' });
    expect(linked.status).toBe(200);
    const second = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        full_name: 'Ravi',
        phone: '+919811112222',
        position: 'helper',
        user_id: USER_ID,
      });
    expect(second.body.error.code).toBe('USER_ALREADY_LINKED');
    const photoUrl = await request(app)
      .post(`/employees/${employeeId}/photo/upload-url?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ content_type: 'image/jpeg', byte_size: 1200 });
    expect(photoUrl.body.data.object_key).toContain('/photo');
    const badKey = await request(app)
      .put(`/employees/${employeeId}/photo?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ object_key: 'tenants/other/photo' });
    expect(badKey.body.error.code).toBe('UPLOAD_KEY_INVALID');
    const photo = await request(app)
      .put(`/employees/${employeeId}/photo?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ object_key: photoUrl.body.data.object_key });
    expect(photo.status).toBe(200);
    const docUrl = await request(app)
      .post(`/employees/${employeeId}/documents/upload-url?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        content_type: 'application/pdf',
        byte_size: 800,
        type: 'id_proof',
        file_name: 'id.pdf',
      });
    const doc = await request(app)
      .post(`/employees/${employeeId}/documents?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        object_key: docUrl.body.data.object_key,
        type: 'id_proof',
        file_name: 'id.pdf',
      });
    expect(doc.status).toBe(201);
    const removed = await request(app)
      .delete(
        `/employees/${employeeId}/documents/${doc.body.data.document_id}?location_id=${LOCAL_SEED_LOCATION_ID}`,
      )
      .set(headers);
    expect(removed.body.data.deleted).toBe(true);
    expect(
      (
        await request(app)
          .delete(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
      ).status,
    ).toBe(405);
    expect(
      (await request(app).get(`/employees?location_id=${OTHER_LOCATION}`).set(headers)).status,
    ).toBe(404);
    const hq = await request(app)
      .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await token({ sub: 'ops', principal_type: 'hq' })}`);
    expect(hq.status).toBe(403);
    const csv = await request(app)
      .get(`/employees/export.csv?location_id=${LOCAL_SEED_LOCATION_ID}&q=anita`)
      .set(headers);
    expect(csv.text).toContain('Anita');
    const listed = await request(app)
      .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&q=anita&page=1&page_size=20`)
      .set(headers);
    expect(listed.body.data.total).toBeGreaterThan(0);
    const detail = await request(app)
      .get(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(detail.body.data.aadhaar).toBeDefined();
    const unlinked = await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ user_id: null, emergency_name: 'Ravi', emergency_phone: '+919800000001' });
    expect(unlinked.body.data.user_id).toBeNull();
  });

  it('rejects invalid payloads and document limits', async () => {
    const { app, employees } = await wired();
    const headers = { authorization: `Bearer ${await ownerToken()}` };
    expect(
      (
        await request(app)
          .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ phone: '+91', position: 'pharmacist' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ ...pharmacistBody, position: 'boss' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ ...pharmacistBody, date_of_birth: '2999-01-01' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ ...pharmacistBody, emergency_name: 'Ravi' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&page_size=200`)
          .set(headers)
      ).status,
    ).toBe(400);
    const created = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ ...pharmacistBody, position: 'other', position_label: 'Intern' });
    const employeeId = created.body.data.employee_id as string;
    for (let i = 0; i < 20; i += 1) {
      await employees.addDocument({
        employeeId,
        type: 'other',
        objectKey: `k${i}`,
        fileName: `${i}.pdf`,
      });
    }
    const limited = await request(app)
      .post(`/employees/${employeeId}/documents/upload-url?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        content_type: 'application/pdf',
        byte_size: 10,
        type: 'other',
        file_name: 'x.pdf',
      });
    expect(limited.body.error.code).toBe('DOCUMENT_LIMIT');
    expect(
      (
        await request(app)
          .post(`/employees/${employeeId}/photo/upload-url?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ content_type: 'application/pdf', byte_size: 10 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get(`/employees/not-a-uuid?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .delete(
            `/employees/${employeeId}/documents/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`,
          )
          .set(headers)
      ).status,
    ).toBe(404);
  });

  it('allows pharmacist-eligible when statutory-registers is unlocked', async () => {
    const plan = new MemoryPlanGatingClient();
    plan.modules = { employees: false, 'statutory-registers': true };
    const { app } = await wired({ planGating: plan });
    const res = await request(app)
      .get(`/employees/pharmacist-eligible?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set('authorization', `Bearer ${await ownerToken()}`);
    expect(res.status).toBe(200);
  });
});
