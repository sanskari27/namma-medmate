import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@namma-medmate/constants';
import {
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_STATUSES,
  createMemoryEmployeesRepository,
  createSqlEmployeesRepository,
} from '../../src/index.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
const NOW = new Date('2026-09-01T10:00:00.000Z');

function baseInput() {
  return {
    tenantId: TENANT,
    locationId: LOCATION,
    fullName: 'Anita Sharma',
    phone: '+919812345678',
    position: 'pharmacist' as const,
    status: 'active' as const,
    pharmacistRegistrationNo: 'KA-12345',
    pharmacistRegistrationExpiry: '2027-03-31',
  };
}

const sqlRow = {
  employee_id: '11111111-1111-4111-8111-111111111111',
  tenant_id: TENANT,
  location_id: LOCATION,
  employee_code: 'EMP-0001',
  full_name: 'Anita Sharma',
  phone: '+919812345678',
  email: null,
  date_of_birth: null,
  gender: null,
  address: null,
  photo_object_key: null,
  position: 'pharmacist',
  position_label: null,
  status: 'active',
  join_date: null,
  user_id: null,
  pan_ciphertext: null,
  aadhaar_ciphertext: null,
  pharmacist_registration_no: 'KA-12345',
  pharmacist_registration_expiry: '2027-03-31',
  bank_account_holder: null,
  bank_account_number_ciphertext: null,
  bank_ifsc: null,
  bank_upi_id: null,
  emergency_name: null,
  emergency_phone: null,
  emergency_relation: null,
  created_at: NOW,
  updated_at: NOW,
};

describe('memory employees repository', () => {
  it('creates auto codes, lists, summarizes, and links users', async () => {
    const repo = createMemoryEmployeesRepository(() => NOW);
    expect(EMPLOYEE_POSITIONS).toContain('pharmacist');
    expect(EMPLOYEE_STATUSES).toContain('separated');
    expect(EMPLOYEE_DOCUMENT_TYPES).toContain('id_proof');
    const created = await repo.createEmployee(baseInput());
    expect(created.employeeCode).toBe('EMP-0001');
    const second = await repo.createEmployee({
      ...baseInput(),
      fullName: 'Ravi Helper',
      position: 'helper',
      pharmacistRegistrationNo: null,
      pharmacistRegistrationExpiry: null,
    });
    expect(second.employeeCode).toBe('EMP-0002');
    await expect(
      repo.createEmployee({ ...baseInput(), employeeCode: 'EMP-0001' }),
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_CODE_TAKEN });
    const listed = await repo.listEmployees({
      tenantId: TENANT,
      locationId: LOCATION,
      q: 'anita',
      position: 'pharmacist',
      status: 'active',
      page: 1,
      pageSize: 20,
    });
    expect(listed.total).toBe(1);
    const summary = await repo.summarize(TENANT, LOCATION);
    expect(summary.headcount.active).toBe(2);
    expect(summary.composition.find((item) => item.position === 'pharmacist')?.count).toBe(1);
    const eligible = await repo.listPharmacistEligible(TENANT, LOCATION);
    expect(eligible).toHaveLength(1);
    await repo.updateEmployee(created.employeeId, { userId: 'u_01' });
    await expect(
      repo.createEmployee({ ...baseInput(), employeeCode: 'EMP-0009', userId: 'u_01' }),
    ).rejects.toMatchObject({ code: ErrorCode.USER_ALREADY_LINKED });
    expect(await repo.findByUserId(TENANT, 'u_01')).toMatchObject({
      employeeId: created.employeeId,
    });
    expect(await repo.findByCode(TENANT, 'EMP-0001')).toMatchObject({ fullName: 'Anita Sharma' });
    expect(await repo.getById(created.employeeId)).toMatchObject({ fullName: 'Anita Sharma' });
    expect(await repo.getById('missing')).toBeUndefined();
    expect(await repo.updateEmployee('missing', { status: 'separated' })).toBeUndefined();
    await repo.updateEmployee(created.employeeId, { status: 'separated', userId: null });
    expect(await repo.listPharmacistEligible(TENANT, LOCATION)).toHaveLength(0);
    const doc = await repo.addDocument({
      employeeId: created.employeeId,
      type: 'pharmacist_registration',
      objectKey: 'key',
      fileName: 'reg.pdf',
    });
    expect(await repo.countDocuments(created.employeeId)).toBe(1);
    expect(await repo.getDocument(created.employeeId, doc.documentId)).toMatchObject({
      fileName: 'reg.pdf',
    });
    expect(await repo.getDocument(created.employeeId, 'missing')).toBeUndefined();
    expect(await repo.deleteDocument(created.employeeId, 'missing')).toBe(false);
    expect(await repo.deleteDocument(created.employeeId, doc.documentId)).toBe(true);
    await repo.putIdempotency({
      tenantId: TENANT,
      idempotencyKey: 'k',
      bodyHash: 'h',
      employeeId: created.employeeId,
    });
    expect(await repo.getIdempotency(TENANT, 'k')).toMatchObject({ bodyHash: 'h' });
    expect(await repo.nextEmployeeCode(TENANT)).toBe('EMP-0003');
    const blank = createMemoryEmployeesRepository();
    const clocked = await blank.createEmployee(baseInput());
    expect(clocked.createdAt).toBeInstanceOf(Date);
  });

  it('covers list filters, uniqueness except-id, and document/idempotency misses', async () => {
    const otherTenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const otherLocation = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const repo = createMemoryEmployeesRepository(() => NOW);
    const named = await repo.createEmployee({
      ...baseInput(),
      employeeId: 'e-named',
      employeeCode: '  EMP-0001',
      fullName: 'Anita Sharma',
      phone: '+919812345678',
    });
    expect(named.employeeCode).toBe('EMP-0001');
    const { status: _status, ...withoutStatus } = baseInput();
    const defaulted = await repo.createEmployee({
      ...withoutStatus,
      fullName: 'Default Status',
      employeeCode: 'DEF-1',
    });
    expect(defaulted.status).toBe('active');
    await repo.createEmployee({
      ...baseInput(),
      tenantId: otherTenant,
      employeeCode: 'EMP-0009',
      fullName: 'Other Shop',
    });
    await repo.createEmployee({
      ...baseInput(),
      locationId: otherLocation,
      employeeCode: 'SHOP-1',
      fullName: 'Offsite Helper',
      position: 'helper',
      status: 'inactive',
    });
    const cashier = await repo.createEmployee({
      ...baseInput(),
      employeeCode: 'CASH-1',
      fullName: 'Zara Cash',
      position: 'cashier',
      status: 'inactive',
      userId: 'u_keep',
    });
    const blankCode = await repo.createEmployee({
      ...baseInput(),
      employeeCode: '   ',
      fullName: 'Blank Code',
      position: 'helper',
    });
    expect(blankCode.employeeCode).toBe('EMP-0002');
    expect(await repo.nextEmployeeCode(TENANT)).toBe('EMP-0003');
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 4 });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        q: 'no-such-staff',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0 });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        q: 'CASH-1',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 1 });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        status: 'separated',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0 });
    const summary = await repo.summarize(TENANT, LOCATION);
    expect(summary.headcount.inactive).toBe(1);
    expect(summary.composition.find((item) => item.position === 'cashier')).toBeUndefined();
    expect(await repo.findByUserId(TENANT, 'missing')).toBeUndefined();
    expect(await repo.findByCode(TENANT, 'missing')).toBeUndefined();
    expect(await repo.updateEmployee(cashier.employeeId, { employeeCode: 'CASH-1' })).toMatchObject(
      {
        employeeCode: 'CASH-1',
      },
    );
    expect(await repo.updateEmployee(cashier.employeeId, { userId: 'u_keep' })).toMatchObject({
      userId: 'u_keep',
    });
    await expect(
      repo.updateEmployee(cashier.employeeId, { employeeCode: 'EMP-0001' }),
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_CODE_TAKEN });
    await repo.updateEmployee(named.employeeId, { userId: 'u_named' });
    await expect(
      repo.updateEmployee(cashier.employeeId, { userId: 'u_named' }),
    ).rejects.toMatchObject({
      code: ErrorCode.USER_ALREADY_LINKED,
    });
    const doc = await repo.addDocument({
      documentId: 'doc-1',
      employeeId: named.employeeId,
      type: 'id_proof',
      objectKey: 'k',
      fileName: 'id.pdf',
      uploadedAt: NOW,
    });
    expect(doc.documentId).toBe('doc-1');
    expect(await repo.listDocuments(named.employeeId)).toHaveLength(1);
    expect(await repo.listDocuments('other')).toEqual([]);
    expect(await repo.getDocument(cashier.employeeId, doc.documentId)).toBeUndefined();
    expect(await repo.deleteDocument(cashier.employeeId, doc.documentId)).toBe(false);
    expect(await repo.getIdempotency(TENANT, 'none')).toBeUndefined();
  });
});

describe('sql employees repository', () => {
  it('maps queries including unique violations', async () => {
    const calls: string[] = [];
    const pool = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        if (
          sql.startsWith('insert into employees (') &&
          calls.filter((item) => item.startsWith('insert into employees (')).length === 1
        ) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('insert into employees (')) {
          const error = Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'employees_tenant_code_uidx',
          });
          throw error;
        }
        if (sql.includes('from employees where employee_id')) {
          return { rows: [sqlRow] };
        }
        if (sql.includes('user_id = $2')) {
          return { rows: [{ ...sqlRow, user_id: 'u_01' }] };
        }
        if (sql.includes('employee_code = $2')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('update employees')) {
          return { rows: [{ ...sqlRow, status: 'inactive' }] };
        }
        if (sql.startsWith('select count(*)::text as count from employees')) {
          return { rows: [{ count: '1' }] };
        }
        if (sql.includes('order by full_name')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('select status, position')) {
          return { rows: [{ status: 'active', position: 'pharmacist' }] };
        }
        if (sql.includes("status = 'active'")) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('select employee_code')) {
          return { rows: [{ employee_code: 'EMP-0001' }, { employee_code: 'X' }] };
        }
        if (sql.startsWith('insert into employee_documents')) {
          return {
            rows: [
              {
                document_id: 'd1',
                employee_id: sqlRow.employee_id,
                type: 'id_proof',
                object_key: 'k',
                file_name: 'id.pdf',
                uploaded_at: NOW,
              },
            ],
          };
        }
        if (sql.startsWith('delete from employee_documents')) {
          return { rowCount: 1 };
        }
        if (
          sql.startsWith('select') &&
          sql.includes('from employee_documents where employee_id = $1 and document_id')
        ) {
          return {
            rows: [
              {
                document_id: 'd1',
                employee_id: sqlRow.employee_id,
                type: 'id_proof',
                object_key: 'k',
                file_name: 'id.pdf',
                uploaded_at: NOW,
              },
            ],
          };
        }
        if (sql.startsWith('select') && sql.includes('from employee_documents where employee_id')) {
          return { rows: [] };
        }
        if (sql.startsWith('select count(*)::text as count from employee_documents')) {
          return { rows: [{ count: '0' }] };
        }
        if (sql.includes('from employees_idempotency')) {
          return {
            rows: [
              {
                tenant_id: TENANT,
                idempotency_key: 'k',
                body_hash: 'h',
                employee_id: sqlRow.employee_id,
              },
            ],
          };
        }
        if (sql.startsWith('insert into employees_idempotency')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlEmployeesRepository(pool as never);
    expect(await repo.createEmployee(baseInput())).toMatchObject({ employeeCode: 'EMP-0001' });
    await expect(repo.createEmployee(baseInput())).rejects.toMatchObject({
      code: ErrorCode.EMPLOYEE_CODE_TAKEN,
    });
    expect(await repo.getById(sqlRow.employee_id)).toMatchObject({ fullName: 'Anita Sharma' });
    expect(await repo.findByUserId(TENANT, 'u_01')).toMatchObject({ userId: 'u_01' });
    expect(await repo.findByCode(TENANT, 'EMP-0001')).toMatchObject({ employeeCode: 'EMP-0001' });
    expect(await repo.updateEmployee(sqlRow.employee_id, { status: 'inactive' })).toMatchObject({
      status: 'inactive',
    });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        position: 'pharmacist',
        status: 'active',
        q: 'anita',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 1 });
    expect(await repo.summarize(TENANT, LOCATION)).toMatchObject({
      headcount: { total: 1, active: 1, inactive: 0, separated: 0 },
    });
    expect(await repo.listPharmacistEligible(TENANT, LOCATION)).toHaveLength(1);
    expect(await repo.nextEmployeeCode(TENANT)).toBe('EMP-0002');
    const doc = await repo.addDocument({
      employeeId: sqlRow.employee_id,
      type: 'id_proof',
      objectKey: 'k',
      fileName: 'id.pdf',
    });
    expect(doc.fileName).toBe('id.pdf');
    expect(await repo.listDocuments(sqlRow.employee_id)).toEqual([]);
    expect(await repo.getDocument(sqlRow.employee_id, 'd1')).toMatchObject({ fileName: 'id.pdf' });
    expect(await repo.deleteDocument(sqlRow.employee_id, 'd1')).toBe(true);
    expect(await repo.countDocuments(sqlRow.employee_id)).toBe(0);
    expect(await repo.getIdempotency(TENANT, 'k')).toMatchObject({ bodyHash: 'h' });
    await repo.putIdempotency({
      tenantId: TENANT,
      idempotencyKey: 'k2',
      bodyHash: 'h2',
      employeeId: sqlRow.employee_id,
    });
  });

  it('maps user unique violations and missing rows', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('select employee_code')) {
          return { rows: [] };
        }
        if (sql.startsWith('insert into employees (')) {
          throw Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'employees_tenant_user_uidx',
          });
        }
        if (sql.includes('from employees where employee_id')) {
          return { rows: [] };
        }
        if (sql.startsWith('update employees')) {
          throw Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'employees_tenant_user_uidx',
          });
        }
        if (sql.includes('from employee_documents where employee_id = $1 and document_id')) {
          return { rows: [] };
        }
        if (sql.startsWith('delete from employee_documents')) {
          return { rowCount: 0 };
        }
        if (sql.includes('from employees_idempotency')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlEmployeesRepository(pool as never);
    await expect(repo.createEmployee({ ...baseInput(), userId: 'u_01' })).rejects.toMatchObject({
      code: ErrorCode.USER_ALREADY_LINKED,
    });
    expect(await repo.getById('missing')).toBeUndefined();
    expect(await repo.updateEmployee('missing', { status: 'separated' })).toBeUndefined();
    const presentPool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from employees where employee_id')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('update employees')) {
          throw Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'employees_tenant_user_uidx',
          });
        }
        return { rows: [] };
      }),
    };
    await expect(
      createSqlEmployeesRepository(presentPool as never).updateEmployee(sqlRow.employee_id, {
        userId: 'u_02',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.USER_ALREADY_LINKED });
    expect(await repo.getDocument('e', 'd')).toBeUndefined();
    expect(await repo.deleteDocument('e', 'd')).toBe(false);
    expect(await repo.getIdempotency(TENANT, 'none')).toBeUndefined();
    expect(await repo.findByUserId(TENANT, 'none')).toBeUndefined();
    expect(await repo.findByCode(TENANT, 'none')).toBeUndefined();
  });

  it('maps unique errors without a named constraint and optional list filters', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('select employee_code')) {
          return { rows: [] };
        }
        if (sql.startsWith('insert into employees (')) {
          throw Object.assign(new Error('dup'), { code: '23505' });
        }
        if (sql.startsWith('select count(*)::text as count from employees')) {
          return { rows: [] };
        }
        if (sql.includes('order by full_name')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('select status, position')) {
          return {
            rows: [
              { status: 'inactive', position: 'cashier' },
              { status: 'separated', position: 'helper' },
              { status: 'active', position: 'pharmacist' },
              { status: 'active', position: 'pharmacist' },
            ],
          };
        }
        if (sql.startsWith('select count(*)::text as count from employee_documents')) {
          return { rows: [{}] };
        }
        if (sql.startsWith('delete from employee_documents')) {
          return {};
        }
        if (sql.includes('from employees where employee_id')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('update employees')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const repo = createSqlEmployeesRepository(pool as never);
    await expect(
      repo.createEmployee(
        (() => {
          const {
            status: _status,
            pharmacistRegistrationNo: _reg,
            pharmacistRegistrationExpiry: _exp,
            ...rest
          } = baseInput();
          return { ...rest, employeeCode: 'EMP-0002' };
        })(),
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.EMPLOYEE_CODE_TAKEN,
    });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0, items: [{ employeeCode: 'EMP-0001' }] });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        position: 'pharmacist',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0 });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        status: 'active',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0 });
    expect(
      await repo.listEmployees({
        tenantId: TENANT,
        locationId: LOCATION,
        q: 'anita',
        page: 1,
        pageSize: 20,
      }),
    ).toMatchObject({ total: 0 });
    expect(await repo.summarize(TENANT, LOCATION)).toMatchObject({
      headcount: { total: 4, active: 2, inactive: 1, separated: 1 },
      composition: [{ position: 'pharmacist', count: 2 }],
    });
    expect(await repo.countDocuments(sqlRow.employee_id)).toBe(0);
    expect(await repo.deleteDocument(sqlRow.employee_id, 'missing')).toBe(false);
    expect(await repo.updateEmployee(sqlRow.employee_id, { fullName: 'Gone' })).toBeUndefined();
    const updateUnique = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from employees where employee_id')) {
          return { rows: [sqlRow] };
        }
        if (sql.startsWith('update employees')) {
          throw Object.assign(new Error('dup'), { code: '23505' });
        }
        return { rows: [] };
      }),
    };
    await expect(
      createSqlEmployeesRepository(updateUnique as never).updateEmployee(sqlRow.employee_id, {
        employeeCode: 'EMP-0009',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_CODE_TAKEN });
    const docPool = {
      query: vi.fn(async () => ({
        rows: [
          {
            document_id: 'd2',
            employee_id: sqlRow.employee_id,
            type: 'other',
            object_key: 'k2',
            file_name: 'other.pdf',
            uploaded_at: NOW,
          },
        ],
      })),
    };
    expect(
      await createSqlEmployeesRepository(docPool as never).addDocument({
        documentId: 'd2',
        employeeId: sqlRow.employee_id,
        type: 'other',
        objectKey: 'k2',
        fileName: 'other.pdf',
        uploadedAt: NOW,
      }),
    ).toMatchObject({ documentId: 'd2' });
  });

  it('rethrows non-unique SQL errors', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('select employee_code')) {
          return { rows: [] };
        }
        throw new Error('db down');
      }),
    };
    await expect(
      createSqlEmployeesRepository(pool as never).createEmployee(baseInput()),
    ).rejects.toThrow('db down');
    const updatePool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('from employees where employee_id')) {
          return { rows: [sqlRow] };
        }
        throw new Error('db down');
      }),
    };
    await expect(
      createSqlEmployeesRepository(updatePool as never).updateEmployee(sqlRow.employee_id, {
        status: 'inactive',
      }),
    ).rejects.toThrow('db down');
  });
});
