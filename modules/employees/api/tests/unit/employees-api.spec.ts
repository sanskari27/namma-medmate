import { createServer, type Server } from 'node:http';
import { inflateSync } from 'node:zlib';
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
import { EmployeesErrors } from '../../src/errors.ts';
import {
  allPermissionsTrue,
  canManageEmployees,
  canReadPharmacistEligible,
} from '../../src/permissions.ts';
import { MemoryPlanGatingClient } from '../../src/plan-gating/client.ts';
import { createHttpPlanGatingClient } from '../../src/plan-gating/http-client.ts';
import { principalFromSession } from '../../src/auth/principal.ts';
import { csvEscape, maskAadhaar, toDocument, toListItem } from '../../src/http/mappers.ts';
import { parseUuid, readBody } from '../../src/http/validate.ts';
import { buildIdCardPdf } from '../../src/id-card.ts';
import {
  confirmPhoto,
  createDocument,
  createDocumentUploadUrl,
  deleteDocument,
  getEmployee,
  getIdCard,
  patchEmployee,
} from '../../src/ops.ts';
import { logEmployeeChanged, type EmployeesRuntime } from '../../src/runtime.ts';
import type { AuthedRequest } from '../../src/http/parse-auth.ts';

const OTHER_LOCATION = '9b8a7c6d-5e4f-3210-9a8b-7c6d5e4f3210';
const CASHIER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_C = 'abababab-abab-4aba-8aba-abababababab';
const MISSING_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const UNKNOWN_ACTOR = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PII_KEY = 'unit-employees-pii-key';

function pdfVisibleText(bytes: Uint8Array | Buffer): string {
  const raw = Buffer.from(bytes);
  const parts = [raw.toString('latin1')];
  const startMarker = Buffer.from('stream\n');
  const endMarker = Buffer.from('\nendstream');
  let offset = 0;
  while (offset < raw.length) {
    const start = raw.indexOf(startMarker, offset);
    if (start === -1) {
      break;
    }
    const dataStart = start + startMarker.length;
    const end = raw.indexOf(endMarker, dataStart);
    if (end === -1) {
      break;
    }
    try {
      const inflated = inflateSync(raw.subarray(dataStart, end)).toString('latin1');
      parts.push(
        inflated.replace(/<([0-9A-Fa-f]+)>/g, (_match, hex: string) =>
          Buffer.from(hex, 'hex').toString('utf8'),
        ),
      );
    } catch {
      parts.push(raw.subarray(dataStart, end).toString('latin1'));
    }
    offset = end + endMarker.length;
  }
  return parts.join('\n');
}

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
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
    expect(csvEscape('plain')).toBe('plain');
    expect(canManageEmployees('cashier', { employees: false })).toBe(false);
    expect(canManageEmployees('owner', {})).toBe(true);
    expect(canReadPharmacistEligible('manager', {})).toBe(true);
    expect(canReadPharmacistEligible('pharmacist', {})).toBe(true);
    expect(canReadPharmacistEligible('cashier', { employees: true })).toBe(true);
    expect(canReadPharmacistEligible('cashier', { 'statutory-registers': true })).toBe(true);
    expect(canReadPharmacistEligible('cashier', {})).toBe(false);
    expect(EmployeesErrors.employeeCodeTaken().code).toBe('EMPLOYEE_CODE_TAKEN');
    expect(EmployeesErrors.employeeAlreadyLinked().code).toBe('EMPLOYEE_ALREADY_LINKED');
    expect(() => parseUuid('not-a-uuid', 'employee_id')).toThrow();
    expect(readBody({ req: { body: 'raw' } })).toEqual({});
    expect(readBody({ req: { body: null } })).toEqual({});
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    logEmployeeChanged(logger as never, {
      tenant_id: LOCAL_SEED_TENANT_ID,
      location_id: LOCAL_SEED_LOCATION_ID,
      employee_id: 'e1',
    });
    expect(logger.info).toHaveBeenCalled();
    const unsigned = { signedGetUrl: () => undefined };
    expect(
      toDocument(
        {
          documentId: 'd1',
          employeeId: 'e1',
          type: 'id_proof',
          objectKey: 'k',
          fileName: 'id.pdf',
          uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        unsigned as never,
        'employees',
      ).download_url,
    ).toBeNull();
    expect(
      toListItem(
        {
          employeeId: 'e1',
          tenantId: LOCAL_SEED_TENANT_ID,
          locationId: LOCAL_SEED_LOCATION_ID,
          employeeCode: 'EMP-0001',
          fullName: 'A',
          phone: '+91',
          email: null,
          dateOfBirth: null,
          gender: null,
          address: null,
          photoObjectKey: 'photo',
          position: 'helper',
          positionLabel: null,
          status: 'active',
          joinDate: null,
          userId: null,
          panCiphertext: null,
          aadhaarCiphertext: null,
          pharmacistRegistrationNo: null,
          pharmacistRegistrationExpiry: null,
          bankAccountHolder: null,
          bankAccountNumberCiphertext: null,
          bankIfsc: null,
          bankUpiId: null,
          emergencyName: null,
          emergencyPhone: null,
          emergencyRelation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        unsigned as never,
        'employees',
        PII_KEY,
      ).photo_url,
    ).toBeNull();
  });

  it('builds an ID card without PAN or Aadhaar', async () => {
    const bytes = await buildIdCardPdf({
      shopName: 'Sri Krishna Medicals',
      fullName: 'Anita Sharma',
      position: 'Pharmacist',
      employeeCode: 'EMP-0001',
      city: 'Bengaluru',
    });
    const text = pdfVisibleText(bytes);
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

  it('defaults in-memory plan-gating and audit clients', () => {
    expect(
      createApp(
        loadEmployeesEnv({
          OIDC_ISSUER: 'http://localhost:8081',
          OIDC_AUDIENCE: 'namma-medmate-dispensary',
          OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
          EMPLOYEES_PII_KEY: PII_KEY,
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
    const pdfText = pdfVisibleText(pdf.body);
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

  it('covers remaining authz, validation, link, and document branches', async () => {
    const lockedDuty = new MemoryPlanGatingClient();
    lockedDuty.modules = { employees: false, 'statutory-registers': false };
    const lockedDutyApp = await wired({ planGating: lockedDuty });
    expect(
      (
        await request(lockedDutyApp.app)
          .get(`/employees/pharmacist-eligible?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set('authorization', `Bearer ${await ownerToken()}`)
      ).body.error.code,
    ).toBe('PLAN_REQUIRED');

    const failingPlan = new MemoryPlanGatingClient();
    failingPlan.fail = true;
    const failingApp = await wired({ planGating: failingPlan });
    expect(
      (
        await request(failingApp.app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set('authorization', `Bearer ${await ownerToken()}`)
      ).status,
    ).toBeGreaterThanOrEqual(500);

    const emptyTenancy = await wired({
      tenancy: createMemoryTenancyRepository(),
    });
    expect(
      (
        await request(emptyTenancy.app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set('authorization', `Bearer ${await ownerToken()}`)
      ).status,
    ).toBe(404);

    const seed = localSeedPharmacy();
    const mismatched = await wired({
      tenancy: createMemoryTenancyRepository({
        ...seed,
        location: { ...seed.location, locationId: OTHER_LOCATION },
      }),
    });
    expect(
      (
        await request(mismatched.app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set('authorization', `Bearer ${await ownerToken()}`)
      ).status,
    ).toBe(404);

    const { app, auth, employees } = await wired();
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
    await auth.createUser({
      userId: USER_B,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'second.user',
      role: 'helper',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: {},
    });
    await auth.createUser({
      userId: USER_C,
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      loginId: 'prelinked.user',
      role: 'helper',
      passwordEnabled: true,
      otpEnabled: false,
      permissions: {},
      employeeId: MISSING_ID,
    });
    const headers = { authorization: `Bearer ${await ownerToken()}` };
    expect(
      (
        await request(app)
          .get(`/employees/pharmacist-eligible?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set('authorization', `Bearer ${await cashierToken()}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(
            'authorization',
            `Bearer ${await token({
              sub: UNKNOWN_ACTOR,
              principal_type: 'pharmacy',
              tenant_id: LOCAL_SEED_TENANT_ID,
              location_id: LOCAL_SEED_LOCATION_ID,
              role: 'owner',
            })}`,
          )
      ).status,
    ).toBe(403);

    const created = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        ...pharmacistBody,
        gender: 'female',
        join_date: '2024-01-15',
        date_of_birth: '1990-05-01',
      });
    expect(created.status).toBe(201);
    const employeeId = created.body.data.employee_id as string;
    const helper = await request(app)
      .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({
        full_name: 'Neha Helper',
        phone: '+919800000009',
        position: 'helper',
        status: 'inactive',
        user_id: null,
        email: '',
      });
    expect(helper.status).toBe(201);
    const helperId = helper.body.data.employee_id as string;
    expect(
      (
        await request(app)
          .get(`/employees/export.csv?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({
            email: '   ',
            full_name: 'Anita Rao',
            phone: '+919812345678',
            position: 'other',
            position_label: 'Relief pharmacist',
            pharmacist_registration_no: '',
            pharmacist_registration_expiry: '',
            emergency_name: '',
            emergency_phone: '',
            emergency_relation: '',
          })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ user_id: USER_C })
      ).body.error.code,
    ).toBe('USER_ALREADY_LINKED');
    expect(
      (
        await request(app)
          .get(`/employees/${MISSING_ID}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&page=0`)
          .set(headers)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&position=boss`)
          .set(headers)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}&position=pharmacist`)
          .set(headers)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/employees?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ ...pharmacistBody, position: 'other', position_label: 'x'.repeat(81) })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ status: 'ghost' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ gender: 'alien' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ gender: null, join_date: null })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ gender: '', join_date: 'nope' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({
            pharmacist_registration_no: 'KA-999',
            pharmacist_registration_expiry: '2029-01-01',
            emergency_relation: 'spouse',
          })
      ).status,
    ).toBe(400);
    const linked = await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ user_id: USER_ID, emergency_name: 'Ravi', emergency_phone: '+919800000001' });
    expect(linked.status).toBe(200);
    const sameLink = await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ user_id: USER_ID });
    expect(sameLink.status).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ user_id: USER_B })
      ).body.error.code,
    ).toBe('EMPLOYEE_ALREADY_LINKED');
    await request(app)
      .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers)
      .send({ user_id: null });
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ user_id: MISSING_ID })
      ).status,
    ).toBe(400);
    await auth.softDeleteUser(USER_B, new Date());
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ user_id: USER_B })
      ).status,
    ).toBe(400);
    await employees.createEmployee({
      tenantId: LOCAL_SEED_TENANT_ID,
      locationId: LOCAL_SEED_LOCATION_ID,
      fullName: 'Orphan Link',
      phone: '+919811110000',
      position: 'helper',
      userId: USER_ID,
    });
    expect(
      (
        await request(app)
          .patch(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ user_id: USER_ID })
      ).body.error.code,
    ).toBe('USER_ALREADY_LINKED');

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
    const detail = await request(app)
      .get(`/employees/${employeeId}?location_id=${LOCAL_SEED_LOCATION_ID}`)
      .set(headers);
    expect(detail.body.data.documents).toHaveLength(1);
    expect(
      (
        await request(app)
          .post(
            `/employees/${employeeId}/documents/upload-url?location_id=${LOCAL_SEED_LOCATION_ID}`,
          )
          .set(headers)
          .send({
            content_type: 'text/plain',
            byte_size: 10,
            type: 'id_proof',
            file_name: 'x.txt',
          })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/employees/${employeeId}/documents?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({ object_key: 'tenants/other/doc', type: 'id_proof', file_name: 'x.pdf' })
      ).body.error.code,
    ).toBe('UPLOAD_KEY_INVALID');
    for (let i = 0; i < 19; i += 1) {
      await employees.addDocument({
        employeeId,
        type: 'other',
        objectKey: `extra-${i}`,
        fileName: `${i}.pdf`,
      });
    }
    expect(
      (
        await request(app)
          .post(`/employees/${employeeId}/documents?location_id=${LOCAL_SEED_LOCATION_ID}`)
          .set(headers)
          .send({
            object_key: docUrl.body.data.object_key,
            type: 'id_proof',
            file_name: 'overflow.pdf',
          })
      ).body.error.code,
    ).toBe('DOCUMENT_LIMIT');

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const runtime: EmployeesRuntime = {
      employees,
      auth,
      tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
      planGating: new MemoryPlanGatingClient(),
      audit: new MemoryAuditClient(),
      storage: new MemoryStorageClient(),
      logger: logger as never,
      piiKey: PII_KEY,
      storageBucket: 'employees',
      now: () => new Date(),
    };
    const authed = (params: Record<string, unknown>, body?: unknown): AuthedRequest =>
      ({
        principal: {
          kind: 'pharmacy',
          sub: LOCAL_SEED_OWNER_ID,
          tenantId: LOCAL_SEED_TENANT_ID,
          locationId: LOCAL_SEED_LOCATION_ID,
          role: 'owner',
        },
        session: { sub: LOCAL_SEED_OWNER_ID },
        accessToken: 'tok',
        req: {
          query: { location_id: LOCAL_SEED_LOCATION_ID },
          params,
          body,
          header: () => undefined,
        },
      }) as AuthedRequest;
    await expect(getEmployee(runtime, authed({}))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    await expect(
      patchEmployee(runtime, authed({ employee_id: employeeId }, { email: 1 })),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      createDocumentUploadUrl(
        runtime,
        authed(
          { employee_id: employeeId },
          { content_type: 'application/pdf', byte_size: 10, type: 'passport', file_name: 'x.pdf' },
        ),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(deleteDocument(runtime, authed({ employee_id: helperId }))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    const issued = await runtime.storage.presignPut({
      bucket: 'employees',
      key: `tenants/${LOCAL_SEED_TENANT_ID}/employees/${helperId}/documents/doc-1`,
      contentType: 'application/pdf',
      expiresInSeconds: 60,
      tenantId: LOCAL_SEED_TENANT_ID,
    });
    runtime.storage.signedGetUrl = () => undefined;
    await expect(
      createDocument(
        runtime,
        authed(
          { employee_id: helperId },
          { object_key: issued.objectKey, type: 'other', file_name: 'note.pdf' },
        ),
      ),
    ).resolves.toMatchObject({ download_url: null });
    const originalGetLocation = runtime.tenancy.getLocationForTenant.bind(runtime.tenancy);
    let locationCalls = 0;
    runtime.tenancy.getLocationForTenant = async (tenantId) => {
      locationCalls += 1;
      const row = await originalGetLocation(tenantId);
      return locationCalls > 1 ? undefined : row;
    };
    const pdf = await getIdCard(runtime, authed({ employee_id: employeeId }));
    expect(pdf.contentType).toMatch(/pdf/);
    runtime.tenancy.getLocationForTenant = originalGetLocation;
    const originalUpdate = employees.updateEmployee.bind(employees);
    employees.updateEmployee = async () => undefined;
    await expect(
      patchEmployee(runtime, authed({ employee_id: employeeId }, { full_name: 'X' })),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await runtime.storage.presignPut({
      bucket: 'employees',
      key: 'photo-key',
      contentType: 'image/jpeg',
      expiresInSeconds: 60,
      tenantId: LOCAL_SEED_TENANT_ID,
    });
    await expect(
      confirmPhoto(runtime, authed({ employee_id: employeeId }, { object_key: 'photo-key' })),
    ).resolves.toMatchObject({ employee_id: employeeId });
    employees.updateEmployee = originalUpdate;
  });
});
