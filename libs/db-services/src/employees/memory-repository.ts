import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode, HttpStatus } from '@namma-medmate/constants';
import { createId } from '@namma-medmate/id-generator';
import { toOffset } from '@namma-medmate/pagination-utils';
import { cloneDocument, cloneEmployee } from './clone.ts';
import type {
  CreateEmployeeInput,
  EmployeeDocumentRecord,
  EmployeePosition,
  EmployeeRecord,
  EmployeesIdempotencyRecord,
  EmployeesRepository,
  ListEmployeesInput,
  UpdateEmployeeInput,
} from './types.ts';

function nextCode(existing: Iterable<EmployeeRecord>, tenantId: string): string {
  let max = 0;
  for (const row of existing) {
    if (row.tenantId !== tenantId) {
      continue;
    }
    const match = /^EMP-(\d{4})$/.exec(row.employeeCode);
    if (match?.[1]) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `EMP-${String(max + 1).padStart(4, '0')}`;
}

function matchesQuery(row: EmployeeRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  return (
    row.fullName.toLowerCase().includes(needle) ||
    row.phone.toLowerCase().includes(needle) ||
    row.employeeCode.toLowerCase().includes(needle)
  );
}

export function createMemoryEmployeesRepository(
  now: () => Date = () => new Date(),
): EmployeesRepository {
  const rows = new Map<string, EmployeeRecord>();
  const documents = new Map<string, EmployeeDocumentRecord>();
  const idempotency = new Map<string, EmployeesIdempotencyRecord>();

  function requireUniqueCode(tenantId: string, code: string, exceptId?: string): void {
    for (const row of rows.values()) {
      if (row.tenantId === tenantId && row.employeeCode === code && row.employeeId !== exceptId) {
        throw new AppError(
          'Employee code is already in use',
          ErrorCode.EMPLOYEE_CODE_TAKEN,
          HttpStatus.CONFLICT,
          undefined,
          'employees.errors.employeeCodeTaken',
        );
      }
    }
  }

  function requireUniqueUser(tenantId: string, userId: string, exceptId?: string): void {
    for (const row of rows.values()) {
      if (row.tenantId === tenantId && row.userId === userId && row.employeeId !== exceptId) {
        throw new AppError(
          'This user is already linked to an employee',
          ErrorCode.USER_ALREADY_LINKED,
          HttpStatus.CONFLICT,
          undefined,
          'employees.errors.userAlreadyLinked',
        );
      }
    }
  }

  return {
    async createEmployee(input: CreateEmployeeInput): Promise<EmployeeRecord> {
      const employeeCode = input.employeeCode?.trim() || nextCode(rows.values(), input.tenantId);
      requireUniqueCode(input.tenantId, employeeCode);
      if (input.userId) {
        requireUniqueUser(input.tenantId, input.userId);
      }
      const createdAt = now();
      const record: EmployeeRecord = {
        employeeId: input.employeeId ?? createId(),
        tenantId: input.tenantId,
        locationId: input.locationId,
        employeeCode,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        photoObjectKey: input.photoObjectKey ?? null,
        position: input.position,
        positionLabel: input.positionLabel ?? null,
        status: input.status ?? 'active',
        joinDate: input.joinDate ?? null,
        userId: input.userId ?? null,
        panCiphertext: input.panCiphertext ?? null,
        aadhaarCiphertext: input.aadhaarCiphertext ?? null,
        pharmacistRegistrationNo: input.pharmacistRegistrationNo ?? null,
        pharmacistRegistrationExpiry: input.pharmacistRegistrationExpiry ?? null,
        bankAccountHolder: input.bankAccountHolder ?? null,
        bankAccountNumberCiphertext: input.bankAccountNumberCiphertext ?? null,
        bankIfsc: input.bankIfsc ?? null,
        bankUpiId: input.bankUpiId ?? null,
        emergencyName: input.emergencyName ?? null,
        emergencyPhone: input.emergencyPhone ?? null,
        emergencyRelation: input.emergencyRelation ?? null,
        createdAt,
        updatedAt: createdAt,
      };
      rows.set(record.employeeId, record);
      return cloneEmployee(record);
    },

    async getById(employeeId) {
      const row = rows.get(employeeId);
      return row ? cloneEmployee(row) : undefined;
    },

    async findByUserId(tenantId, userId) {
      for (const row of rows.values()) {
        if (row.tenantId === tenantId && row.userId === userId) {
          return cloneEmployee(row);
        }
      }
      return undefined;
    },

    async findByCode(tenantId, employeeCode) {
      for (const row of rows.values()) {
        if (row.tenantId === tenantId && row.employeeCode === employeeCode) {
          return cloneEmployee(row);
        }
      }
      return undefined;
    },

    async updateEmployee(employeeId, patch: UpdateEmployeeInput) {
      const row = rows.get(employeeId);
      if (!row) {
        return undefined;
      }
      if (patch.employeeCode && patch.employeeCode !== row.employeeCode) {
        requireUniqueCode(row.tenantId, patch.employeeCode, employeeId);
      }
      if (patch.userId) {
        requireUniqueUser(row.tenantId, patch.userId, employeeId);
      }
      for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined) {
          (row as unknown as Record<string, unknown>)[key] = value;
        }
      }
      row.updatedAt = now();
      return cloneEmployee(row);
    },

    async listEmployees(input: ListEmployeesInput) {
      const filtered = [...rows.values()].filter((row) => {
        if (row.tenantId !== input.tenantId || row.locationId !== input.locationId) {
          return false;
        }
        if (input.position && row.position !== input.position) {
          return false;
        }
        if (input.status && row.status !== input.status) {
          return false;
        }
        if (input.q && !matchesQuery(row, input.q)) {
          return false;
        }
        return true;
      });
      filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
      const offset = toOffset({ page: input.page, pageSize: input.pageSize });
      return {
        items: filtered.slice(offset, offset + input.pageSize).map(cloneEmployee),
        total: filtered.length,
      };
    },

    async summarize(tenantId, locationId) {
      const scoped = [...rows.values()].filter(
        (row) => row.tenantId === tenantId && row.locationId === locationId,
      );
      const headcount = { total: scoped.length, active: 0, inactive: 0, separated: 0 };
      const counts = new Map<EmployeePosition, number>();
      for (const row of scoped) {
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
      return [...rows.values()]
        .filter(
          (row) =>
            row.tenantId === tenantId &&
            row.locationId === locationId &&
            row.status === 'active' &&
            Boolean(row.pharmacistRegistrationNo),
        )
        .map(cloneEmployee);
    },

    async nextEmployeeCode(tenantId) {
      return nextCode(rows.values(), tenantId);
    },

    async addDocument(input) {
      const record: EmployeeDocumentRecord = {
        documentId: input.documentId ?? createId(),
        employeeId: input.employeeId,
        type: input.type,
        objectKey: input.objectKey,
        fileName: input.fileName,
        uploadedAt: input.uploadedAt ?? now(),
      };
      documents.set(record.documentId, record);
      return cloneDocument(record);
    },

    async listDocuments(employeeId) {
      return [...documents.values()]
        .filter((row) => row.employeeId === employeeId)
        .map(cloneDocument);
    },

    async getDocument(employeeId, documentId) {
      const row = documents.get(documentId);
      if (!row || row.employeeId !== employeeId) {
        return undefined;
      }
      return cloneDocument(row);
    },

    async deleteDocument(employeeId, documentId) {
      const row = documents.get(documentId);
      if (!row || row.employeeId !== employeeId) {
        return false;
      }
      documents.delete(documentId);
      return true;
    },

    async countDocuments(employeeId) {
      return [...documents.values()].filter((row) => row.employeeId === employeeId).length;
    },

    async getIdempotency(tenantId, key) {
      return idempotency.get(`${tenantId}:${key}`);
    },

    async putIdempotency(record) {
      idempotency.set(`${record.tenantId}:${record.idempotencyKey}`, { ...record });
    },
  };
}
