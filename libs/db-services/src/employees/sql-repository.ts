import type { Pool, QueryResult } from 'pg';
import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { toOffset } from '@namma-medmate/pagination-utils';
import { isUniqueViolation } from '../tenancy/errors.ts';
import type {
  CreateEmployeeInput,
  EmployeeDocumentRecord,
  EmployeeDocumentType,
  EmployeeGender,
  EmployeePosition,
  EmployeeRecord,
  EmployeeStatus,
  EmployeesIdempotencyRecord,
  EmployeesRepository,
  ListEmployeesInput,
  UpdateEmployeeInput,
} from './types.ts';

interface EmployeeRow {
  employee_id: string;
  tenant_id: string;
  location_id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: EmployeeGender | null;
  address: string | null;
  photo_object_key: string | null;
  position: EmployeePosition;
  position_label: string | null;
  status: EmployeeStatus;
  join_date: string | null;
  user_id: string | null;
  pan_ciphertext: string | null;
  aadhaar_ciphertext: string | null;
  pharmacist_registration_no: string | null;
  pharmacist_registration_expiry: string | null;
  bank_account_holder: string | null;
  bank_account_number_ciphertext: string | null;
  bank_ifsc: string | null;
  bank_upi_id: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relation: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DocumentRow {
  document_id: string;
  employee_id: string;
  type: EmployeeDocumentType;
  object_key: string;
  file_name: string;
  uploaded_at: Date;
}

const SELECT = `select employee_id, tenant_id, location_id, employee_code, full_name, phone, email,
  date_of_birth, gender, address, photo_object_key, position, position_label, status, join_date,
  user_id, pan_ciphertext, aadhaar_ciphertext, pharmacist_registration_no,
  pharmacist_registration_expiry, bank_account_holder, bank_account_number_ciphertext,
  bank_ifsc, bank_upi_id, emergency_name, emergency_phone, emergency_relation, created_at, updated_at
  from employees`;

function mapEmployee(row: EmployeeRow): EmployeeRecord {
  return {
    employeeId: row.employee_id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    photoObjectKey: row.photo_object_key,
    position: row.position,
    positionLabel: row.position_label,
    status: row.status,
    joinDate: row.join_date,
    userId: row.user_id,
    panCiphertext: row.pan_ciphertext,
    aadhaarCiphertext: row.aadhaar_ciphertext,
    pharmacistRegistrationNo: row.pharmacist_registration_no,
    pharmacistRegistrationExpiry: row.pharmacist_registration_expiry,
    bankAccountHolder: row.bank_account_holder,
    bankAccountNumberCiphertext: row.bank_account_number_ciphertext,
    bankIfsc: row.bank_ifsc,
    bankUpiId: row.bank_upi_id,
    emergencyName: row.emergency_name,
    emergencyPhone: row.emergency_phone,
    emergencyRelation: row.emergency_relation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: DocumentRow): EmployeeDocumentRecord {
  return {
    documentId: row.document_id,
    employeeId: row.employee_id,
    type: row.type,
    objectKey: row.object_key,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
  };
}

function uniqueError(error: unknown): never {
  const constraint = String((error as { constraint?: unknown }).constraint ?? '');
  if (constraint.includes('user')) {
    throw new AppError(
      'This user is already linked to an employee',
      ErrorCode.USER_ALREADY_LINKED,
      HttpStatus.CONFLICT,
      undefined,
      'employees.errors.userAlreadyLinked',
    );
  }
  throw new AppError(
    'Employee code is already in use',
    ErrorCode.EMPLOYEE_CODE_TAKEN,
    HttpStatus.CONFLICT,
    undefined,
    'employees.errors.employeeCodeTaken',
  );
}

export function createSqlEmployeesRepository(pool: Pool): EmployeesRepository {
  return {
    async createEmployee(input: CreateEmployeeInput): Promise<EmployeeRecord> {
      const employeeId = input.employeeId ?? createId();
      const employeeCode =
        input.employeeCode?.trim() || (await this.nextEmployeeCode(input.tenantId));
      try {
        const result = await pool.query<EmployeeRow>(
          `insert into employees (
            employee_id, tenant_id, location_id, employee_code, full_name, phone, email,
            date_of_birth, gender, address, photo_object_key, position, position_label, status,
            join_date, user_id, pan_ciphertext, aadhaar_ciphertext, pharmacist_registration_no,
            pharmacist_registration_expiry, bank_account_holder, bank_account_number_ciphertext,
            bank_ifsc, bank_upi_id, emergency_name, emergency_phone, emergency_relation
          ) values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
          ) returning *`,
          [
            employeeId,
            input.tenantId,
            input.locationId,
            employeeCode,
            input.fullName,
            input.phone,
            input.email ?? null,
            input.dateOfBirth ?? null,
            input.gender ?? null,
            input.address ?? null,
            input.photoObjectKey ?? null,
            input.position,
            input.positionLabel ?? null,
            input.status ?? 'active',
            input.joinDate ?? null,
            input.userId ?? null,
            input.panCiphertext ?? null,
            input.aadhaarCiphertext ?? null,
            input.pharmacistRegistrationNo ?? null,
            input.pharmacistRegistrationExpiry ?? null,
            input.bankAccountHolder ?? null,
            input.bankAccountNumberCiphertext ?? null,
            input.bankIfsc ?? null,
            input.bankUpiId ?? null,
            input.emergencyName ?? null,
            input.emergencyPhone ?? null,
            input.emergencyRelation ?? null,
          ],
        );
        return mapEmployee(result.rows[0]!);
      } catch (error) {
        if (isUniqueViolation(error)) {
          uniqueError(error);
        }
        throw error;
      }
    },

    async getById(employeeId) {
      const result = await pool.query<EmployeeRow>(`${SELECT} where employee_id = $1`, [
        employeeId,
      ]);
      const row = result.rows[0];
      return row ? mapEmployee(row) : undefined;
    },

    async findByUserId(tenantId, userId) {
      const result = await pool.query<EmployeeRow>(
        `${SELECT} where tenant_id = $1 and user_id = $2`,
        [tenantId, userId],
      );
      const row = result.rows[0];
      return row ? mapEmployee(row) : undefined;
    },

    async findByCode(tenantId, employeeCode) {
      const result = await pool.query<EmployeeRow>(
        `${SELECT} where tenant_id = $1 and employee_code = $2`,
        [tenantId, employeeCode],
      );
      const row = result.rows[0];
      return row ? mapEmployee(row) : undefined;
    },

    async updateEmployee(employeeId, patch: UpdateEmployeeInput) {
      const current = await this.getById(employeeId);
      if (!current) {
        return undefined;
      }
      const next: EmployeeRecord = { ...current, ...patch, updatedAt: new Date() };
      try {
        const result = await pool.query<EmployeeRow>(
          `update employees set employee_code=$2, full_name=$3, phone=$4, email=$5, date_of_birth=$6,
            gender=$7, address=$8, photo_object_key=$9, position=$10, position_label=$11, status=$12,
            join_date=$13, user_id=$14, pan_ciphertext=$15, aadhaar_ciphertext=$16,
            pharmacist_registration_no=$17, pharmacist_registration_expiry=$18, bank_account_holder=$19,
            bank_account_number_ciphertext=$20, bank_ifsc=$21, bank_upi_id=$22, emergency_name=$23,
            emergency_phone=$24, emergency_relation=$25, updated_at=now()
            where employee_id=$1 returning *`,
          [
            employeeId,
            next.employeeCode,
            next.fullName,
            next.phone,
            next.email,
            next.dateOfBirth,
            next.gender,
            next.address,
            next.photoObjectKey,
            next.position,
            next.positionLabel,
            next.status,
            next.joinDate,
            next.userId,
            next.panCiphertext,
            next.aadhaarCiphertext,
            next.pharmacistRegistrationNo,
            next.pharmacistRegistrationExpiry,
            next.bankAccountHolder,
            next.bankAccountNumberCiphertext,
            next.bankIfsc,
            next.bankUpiId,
            next.emergencyName,
            next.emergencyPhone,
            next.emergencyRelation,
          ],
        );
        const row = result.rows[0];
        return row ? mapEmployee(row) : undefined;
      } catch (error) {
        if (isUniqueViolation(error)) {
          uniqueError(error);
        }
        throw error;
      }
    },

    async listEmployees(input: ListEmployeesInput) {
      const filters = ['tenant_id = $1', 'location_id = $2'];
      const params: unknown[] = [input.tenantId, input.locationId];
      if (input.position) {
        params.push(input.position);
        filters.push(`position = $${params.length}`);
      }
      if (input.status) {
        params.push(input.status);
        filters.push(`status = $${params.length}`);
      }
      if (input.q) {
        params.push(`%${input.q.trim().toLowerCase()}%`);
        filters.push(
          `(lower(full_name) like $${params.length} or lower(phone) like $${params.length} or lower(employee_code) like $${params.length})`,
        );
      }
      const where = filters.join(' and ');
      const count = await pool.query<{ count: string }>(
        `select count(*)::text as count from employees where ${where}`,
        params,
      );
      const offset = toOffset({ page: input.page, pageSize: input.pageSize });
      params.push(input.pageSize, offset);
      const result = await pool.query<EmployeeRow>(
        `${SELECT} where ${where} order by full_name asc limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return {
        items: result.rows.map(mapEmployee),
        total: Number(count.rows[0]?.count ?? 0),
      };
    },

    async summarize(tenantId, locationId) {
      const result = await pool.query<{ status: EmployeeStatus; position: EmployeePosition }>(
        `select status, position from employees where tenant_id = $1 and location_id = $2`,
        [tenantId, locationId],
      );
      const headcount = { total: result.rows.length, active: 0, inactive: 0, separated: 0 };
      const counts = new Map<EmployeePosition, number>();
      for (const row of result.rows) {
        headcount[row.status] += 1;
        if (row.status === 'active') {
          counts.set(row.position, (counts.get(row.position) ?? 0) + 1);
        }
      }
      return {
        headcount,
        composition: [...counts.entries()].map(([position, count]) => ({ position, count })),
      };
    },

    async listPharmacistEligible(tenantId, locationId) {
      const result = await pool.query<EmployeeRow>(
        `${SELECT} where tenant_id = $1 and location_id = $2 and status = 'active'
          and pharmacist_registration_no is not null and pharmacist_registration_no <> ''`,
        [tenantId, locationId],
      );
      return result.rows.map(mapEmployee);
    },

    async nextEmployeeCode(tenantId) {
      const result = await pool.query<{ employee_code: string }>(
        `select employee_code from employees where tenant_id = $1`,
        [tenantId],
      );
      let max = 0;
      for (const row of result.rows) {
        const match = /^EMP-(\d{4})$/.exec(row.employee_code);
        if (match?.[1]) {
          max = Math.max(max, Number(match[1]));
        }
      }
      return `EMP-${String(max + 1).padStart(4, '0')}`;
    },

    async addDocument(input) {
      const documentId = input.documentId ?? createId();
      const result = await pool.query<DocumentRow>(
        `insert into employee_documents (document_id, employee_id, type, object_key, file_name, uploaded_at)
         values ($1,$2,$3,$4,$5,coalesce($6, now())) returning *`,
        [
          documentId,
          input.employeeId,
          input.type,
          input.objectKey,
          input.fileName,
          input.uploadedAt ?? null,
        ],
      );
      return mapDocument(result.rows[0]!);
    },

    async listDocuments(employeeId) {
      const result = await pool.query<DocumentRow>(
        `select document_id, employee_id, type, object_key, file_name, uploaded_at
         from employee_documents where employee_id = $1 order by uploaded_at asc`,
        [employeeId],
      );
      return result.rows.map(mapDocument);
    },

    async getDocument(employeeId, documentId) {
      const result = await pool.query<DocumentRow>(
        `select document_id, employee_id, type, object_key, file_name, uploaded_at
         from employee_documents where employee_id = $1 and document_id = $2`,
        [employeeId, documentId],
      );
      const row = result.rows[0];
      return row ? mapDocument(row) : undefined;
    },

    async deleteDocument(employeeId, documentId) {
      const result: QueryResult = await pool.query(
        `delete from employee_documents where employee_id = $1 and document_id = $2`,
        [employeeId, documentId],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async countDocuments(employeeId) {
      const result = await pool.query<{ count: string }>(
        `select count(*)::text as count from employee_documents where employee_id = $1`,
        [employeeId],
      );
      return Number(result.rows[0]?.count ?? 0);
    },

    async getIdempotency(tenantId, key) {
      const result = await pool.query<
        EmployeesIdempotencyRecord & {
          body_hash: string;
          employee_id: string;
          tenant_id: string;
          idempotency_key: string;
        }
      >(
        `select tenant_id, idempotency_key, body_hash, employee_id from employees_idempotency
         where tenant_id = $1 and idempotency_key = $2`,
        [tenantId, key],
      );
      const row = result.rows[0];
      if (!row) {
        return undefined;
      }
      return {
        tenantId: row.tenant_id,
        idempotencyKey: row.idempotency_key,
        bodyHash: row.body_hash,
        employeeId: row.employee_id,
      };
    },

    async putIdempotency(record: EmployeesIdempotencyRecord) {
      await pool.query(
        `insert into employees_idempotency (tenant_id, idempotency_key, body_hash, employee_id)
         values ($1,$2,$3,$4)`,
        [record.tenantId, record.idempotencyKey, record.bodyHash, record.employeeId],
      );
    },
  };
}
