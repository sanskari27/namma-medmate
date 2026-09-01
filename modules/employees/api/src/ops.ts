import { sealSecret, sha256 } from '@namma-medmate/encryption-utils';
import {
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_GENDERS,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_STATUSES,
  type EmployeeDocumentType,
  type EmployeeGender,
  type EmployeePosition,
  type EmployeeRecord,
  type EmployeeStatus,
} from '@namma-medmate/db-services';
import type { RawHttpBody } from '@namma-medmate/lambda-bootstrap';
import { EmployeesErrors } from './errors.ts';
import { recordAudit } from './audit/record.ts';
import {
  requirePharmacyLocation,
  requireEmployeesPermission,
  requirePharmacistEligiblePermission,
} from './http/scope.ts';
import { csvEscape, decryptOptional, maskAadhaar, toDetail, toListItem } from './http/mappers.ts';
import { parseUuid, readBody } from './http/validate.ts';
import type { AuthedRequest } from './http/parse-auth.ts';
import { buildIdCardPdf } from './id-card.ts';
import type { EmployeesRuntime } from './runtime.ts';

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOC_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function loadActor(runtime: EmployeesRuntime, input: AuthedRequest) {
  const pharmacy = await requirePharmacyLocation(
    input,
    runtime.tenancy,
    input.req.query.location_id,
  );
  const actor = await runtime.auth.findUserById(pharmacy.sub);
  if (!actor || actor.tenantId !== pharmacy.tenantId || actor.locationId !== pharmacy.locationId) {
    throw EmployeesErrors.forbidden();
  }
  return { pharmacy, actor };
}

async function requireEmployeesPlan(
  runtime: EmployeesRuntime,
  input: AuthedRequest,
  locationId: string,
) {
  const entitlements = await runtime.planGating.getEntitlements(input.accessToken, locationId);
  if (entitlements.modules.employees !== true) {
    throw EmployeesErrors.planRequired();
  }
}

async function requireDutyPlan(
  runtime: EmployeesRuntime,
  input: AuthedRequest,
  locationId: string,
) {
  const entitlements = await runtime.planGating.getEntitlements(input.accessToken, locationId);
  if (
    entitlements.modules.employees !== true &&
    entitlements.modules['statutory-registers'] !== true
  ) {
    throw EmployeesErrors.planRequired();
  }
}

async function loadEmployee(
  runtime: EmployeesRuntime,
  employeeId: string,
  tenantId: string,
  locationId: string,
): Promise<EmployeeRecord> {
  const row = await runtime.employees.getById(employeeId);
  if (!row || row.tenantId !== tenantId || row.locationId !== locationId) {
    throw EmployeesErrors.notFound();
  }
  return row;
}

function readEmployeeId(input: AuthedRequest): string {
  const raw = input.req.params.employee_id;
  if (typeof raw !== 'string') {
    throw EmployeesErrors.validationError('employee_id must be a UUID');
  }
  return parseUuid(raw, 'employee_id');
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw EmployeesErrors.validationError();
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw EmployeesErrors.validationError(`${field} is required`);
  }
  return value.trim();
}

function parsePosition(value: unknown): EmployeePosition {
  if (typeof value !== 'string' || !(EMPLOYEE_POSITIONS as readonly string[]).includes(value)) {
    throw EmployeesErrors.validationError('position is invalid');
  }
  return value as EmployeePosition;
}

function parseStatus(value: unknown): EmployeeStatus {
  if (typeof value !== 'string' || !(EMPLOYEE_STATUSES as readonly string[]).includes(value)) {
    throw EmployeesErrors.validationError('status is invalid');
  }
  return value as EmployeeStatus;
}

function parseGender(value: unknown): EmployeeGender | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !(EMPLOYEE_GENDERS as readonly string[]).includes(value)) {
    throw EmployeesErrors.validationError('gender is invalid');
  }
  return value as EmployeeGender;
}

function parseIsoDate(value: unknown, field: string, pastOnly = false): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw EmployeesErrors.validationError(`${field} must be YYYY-MM-DD`);
  }
  if (pastOnly && value >= new Date().toISOString().slice(0, 10)) {
    throw EmployeesErrors.validationError('date_of_birth must be in the past');
  }
  return value;
}

function parseDocType(value: unknown): EmployeeDocumentType {
  if (
    typeof value !== 'string' ||
    !(EMPLOYEE_DOCUMENT_TYPES as readonly string[]).includes(value)
  ) {
    throw EmployeesErrors.validationError('document type is invalid');
  }
  return value as EmployeeDocumentType;
}

function sealIfPresent(value: string | null | undefined, key: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? sealSecret(value, key) : null;
}

function assertPharmacistPair(
  no: string | null | undefined,
  expiry: string | null | undefined,
): void {
  const hasNo = Boolean(no);
  const hasExpiry = Boolean(expiry);
  if (hasNo !== hasExpiry) {
    throw EmployeesErrors.pharmacistRegIncomplete();
  }
}

function assertEmergency(
  name: string | null | undefined,
  phone: string | null | undefined,
  relation: string | null | undefined,
): void {
  const anySet = Boolean(name) || Boolean(phone) || Boolean(relation);
  if (anySet && (!name || !phone)) {
    throw EmployeesErrors.validationError('emergency name and phone are required together');
  }
}

async function resolveUserLink(
  runtime: EmployeesRuntime,
  tenantId: string,
  locationId: string,
  employee: EmployeeRecord | undefined,
  userId: string | null | undefined,
): Promise<string | null | undefined> {
  if (userId === undefined) {
    return undefined;
  }
  if (userId === null) {
    return null;
  }
  const parsed = parseUuid(userId, 'user_id');
  if (employee?.userId && employee.userId !== parsed) {
    throw EmployeesErrors.employeeAlreadyLinked();
  }
  if (employee?.userId === parsed) {
    return parsed;
  }
  const user = await runtime.auth.findUserById(parsed);
  if (!user || user.tenantId !== tenantId || user.locationId !== locationId || user.removedAt) {
    throw EmployeesErrors.validationError('user_id is not in this pharmacy');
  }
  if (user.employeeId && user.employeeId !== employee?.employeeId) {
    throw EmployeesErrors.userAlreadyLinked();
  }
  const existing = await runtime.employees.findByUserId(tenantId, parsed);
  if (existing && existing.employeeId !== employee?.employeeId) {
    throw EmployeesErrors.userAlreadyLinked();
  }
  return parsed;
}

async function syncUserLink(
  runtime: EmployeesRuntime,
  previous: string | null,
  next: string | null,
  employeeId: string,
): Promise<void> {
  if (previous === next) {
    return;
  }
  if (previous) {
    await runtime.auth.updateUserProfile(previous, { employeeId: null });
  }
  if (next) {
    await runtime.auth.updateUserProfile(next, { employeeId });
  }
}

function pageArgs(input: AuthedRequest): { page: number; pageSize: number } {
  const page = Number(input.req.query.page ?? 1);
  const pageSize = Number(input.req.query.page_size ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    throw EmployeesErrors.validationError('page is invalid');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw EmployeesErrors.validationError('page_size is invalid');
  }
  return { page, pageSize };
}

function listFilters(input: AuthedRequest): {
  position?: EmployeePosition;
  status?: EmployeeStatus;
  q?: string;
} {
  const position =
    typeof input.req.query.position === 'string'
      ? parsePosition(input.req.query.position)
      : undefined;
  const status =
    typeof input.req.query.status === 'string' ? parseStatus(input.req.query.status) : undefined;
  const q = typeof input.req.query.q === 'string' ? input.req.query.q : undefined;
  return { position, status, q };
}

export async function getSummary(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  return runtime.employees.summarize(pharmacy.tenantId, pharmacy.locationId);
}

export async function listEmployees(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const { page, pageSize } = pageArgs(input);
  const result = await runtime.employees.listEmployees({
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    ...listFilters(input),
    page,
    pageSize,
  });
  return {
    items: result.items.map((row) =>
      toListItem(row, runtime.storage, runtime.storageBucket, runtime.piiKey),
    ),
    page,
    page_size: pageSize,
    total: result.total,
  };
}

export async function createEmployee(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const body = readBody(input);
  const fullName = requiredString(body.full_name, 'full_name');
  const phone = requiredString(body.phone, 'phone');
  const position = parsePosition(body.position);
  const status = body.status === undefined ? 'active' : parseStatus(body.status);
  const positionLabel = optionalString(body.position_label) ?? null;
  if (position === 'other' && positionLabel && positionLabel.length > 80) {
    throw EmployeesErrors.validationError('position_label is too long');
  }
  const pharmacistNo = optionalString(body.pharmacist_registration_no) ?? null;
  const pharmacistExpiry =
    parseIsoDate(body.pharmacist_registration_expiry, 'pharmacist_registration_expiry') ?? null;
  assertPharmacistPair(pharmacistNo, pharmacistExpiry);
  const emergencyName = optionalString(body.emergency_name) ?? null;
  const emergencyPhone = optionalString(body.emergency_phone) ?? null;
  const emergencyRelation = optionalString(body.emergency_relation) ?? null;
  assertEmergency(emergencyName, emergencyPhone, emergencyRelation);
  const userId = await resolveUserLink(
    runtime,
    pharmacy.tenantId,
    pharmacy.locationId,
    undefined,
    body.user_id === undefined ? null : (optionalString(body.user_id) ?? null),
  );
  const idempotencyKey = input.req.header('idempotency-key');
  const bodyHash = sha256(JSON.stringify(body));
  if (idempotencyKey) {
    const existing = await runtime.employees.getIdempotency(pharmacy.tenantId, idempotencyKey);
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        throw EmployeesErrors.idempotencyConflict();
      }
      const replay = await loadEmployee(
        runtime,
        existing.employeeId,
        pharmacy.tenantId,
        pharmacy.locationId,
      );
      return toDetail(
        replay,
        await runtime.employees.listDocuments(replay.employeeId),
        runtime.storage,
        runtime.storageBucket,
        runtime.piiKey,
      );
    }
  }
  const created = await runtime.employees.createEmployee({
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    fullName,
    phone,
    position,
    status,
    positionLabel: position === 'other' ? positionLabel : null,
    email: optionalString(body.email) ?? null,
    dateOfBirth: parseIsoDate(body.date_of_birth, 'date_of_birth', true) ?? null,
    gender: parseGender(body.gender) ?? null,
    address: optionalString(body.address) ?? null,
    photoObjectKey: null,
    joinDate: parseIsoDate(body.join_date, 'join_date') ?? null,
    employeeCode: optionalString(body.employee_code) ?? undefined,
    userId: userId ?? null,
    panCiphertext: sealIfPresent(optionalString(body.pan) ?? null, runtime.piiKey) ?? null,
    aadhaarCiphertext: sealIfPresent(optionalString(body.aadhaar) ?? null, runtime.piiKey) ?? null,
    pharmacistRegistrationNo: pharmacistNo,
    pharmacistRegistrationExpiry: pharmacistExpiry,
    bankAccountHolder: optionalString(body.bank_account_holder) ?? null,
    bankAccountNumberCiphertext:
      sealIfPresent(optionalString(body.bank_account_number) ?? null, runtime.piiKey) ?? null,
    bankIfsc: optionalString(body.bank_ifsc) ?? null,
    bankUpiId: optionalString(body.bank_upi_id) ?? null,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
  });
  await syncUserLink(runtime, null, created.userId, created.employeeId);
  if (idempotencyKey) {
    await runtime.employees.putIdempotency({
      tenantId: pharmacy.tenantId,
      idempotencyKey,
      bodyHash,
      employeeId: created.employeeId,
    });
  }
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'employee.created',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: created.employeeId,
    after: { employee_code: created.employeeCode, position: created.position },
    idempotencyKey: `employee.created:${created.employeeId}`,
  });
  runtime.logger.info('employees.employee.created', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    employee_id: created.employeeId,
  });
  return toDetail(created, [], runtime.storage, runtime.storageBucket, runtime.piiKey);
}

export async function getEmployee(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const row = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  return toDetail(
    row,
    await runtime.employees.listDocuments(row.employeeId),
    runtime.storage,
    runtime.storageBucket,
    runtime.piiKey,
  );
}

export async function patchEmployee(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const current = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const body = readBody(input);
  const pharmacistNo =
    body.pharmacist_registration_no === undefined
      ? current.pharmacistRegistrationNo
      : (optionalString(body.pharmacist_registration_no) ?? null);
  const pharmacistExpiry =
    body.pharmacist_registration_expiry === undefined
      ? current.pharmacistRegistrationExpiry
      : (parseIsoDate(body.pharmacist_registration_expiry, 'pharmacist_registration_expiry') ??
        null);
  assertPharmacistPair(pharmacistNo, pharmacistExpiry);
  const emergencyName =
    body.emergency_name === undefined
      ? current.emergencyName
      : (optionalString(body.emergency_name) ?? null);
  const emergencyPhone =
    body.emergency_phone === undefined
      ? current.emergencyPhone
      : (optionalString(body.emergency_phone) ?? null);
  const emergencyRelation =
    body.emergency_relation === undefined
      ? current.emergencyRelation
      : (optionalString(body.emergency_relation) ?? null);
  assertEmergency(emergencyName, emergencyPhone, emergencyRelation);
  const nextUserId = await resolveUserLink(
    runtime,
    pharmacy.tenantId,
    pharmacy.locationId,
    current,
    body.user_id === undefined ? undefined : (optionalString(body.user_id) ?? null),
  );
  const position = body.position === undefined ? current.position : parsePosition(body.position);
  const updated = await runtime.employees.updateEmployee(current.employeeId, {
    fullName:
      body.full_name === undefined ? undefined : requiredString(body.full_name, 'full_name'),
    phone: body.phone === undefined ? undefined : requiredString(body.phone, 'phone'),
    position,
    positionLabel:
      position === 'other' ? (optionalString(body.position_label) ?? current.positionLabel) : null,
    status: body.status === undefined ? undefined : parseStatus(body.status),
    email: optionalString(body.email),
    dateOfBirth: parseIsoDate(body.date_of_birth, 'date_of_birth', true),
    gender: parseGender(body.gender),
    address: optionalString(body.address),
    joinDate: parseIsoDate(body.join_date, 'join_date'),
    employeeCode: optionalString(body.employee_code) ?? undefined,
    userId: nextUserId,
    panCiphertext: sealIfPresent(optionalString(body.pan), runtime.piiKey),
    aadhaarCiphertext: sealIfPresent(optionalString(body.aadhaar), runtime.piiKey),
    pharmacistRegistrationNo: pharmacistNo,
    pharmacistRegistrationExpiry: pharmacistExpiry,
    bankAccountHolder: optionalString(body.bank_account_holder),
    bankAccountNumberCiphertext: sealIfPresent(
      optionalString(body.bank_account_number),
      runtime.piiKey,
    ),
    bankIfsc: optionalString(body.bank_ifsc),
    bankUpiId: optionalString(body.bank_upi_id),
    emergencyName,
    emergencyPhone,
    emergencyRelation,
  });
  if (!updated) {
    throw EmployeesErrors.notFound();
  }
  if (nextUserId !== undefined) {
    await syncUserLink(runtime, current.userId, nextUserId, updated.employeeId);
  }
  const fields = Object.keys(body);
  await recordAudit(runtime.audit, runtime.logger, {
    action: current.status !== updated.status ? 'employee.status.changed' : 'employee.updated',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: updated.employeeId,
    after: { fields },
    idempotencyKey: `employee.updated:${updated.employeeId}:${runtime.now().toISOString()}`,
  });
  if (current.userId !== updated.userId) {
    await recordAudit(runtime.audit, runtime.logger, {
      action: updated.userId ? 'employee.user.linked' : 'employee.user.unlinked',
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      targetId: updated.employeeId,
      after: { user_id: updated.userId ?? current.userId },
      idempotencyKey: `employee.user:${updated.employeeId}:${runtime.now().toISOString()}`,
    });
  }
  runtime.logger.info('employees.employee.updated', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    employee_id: updated.employeeId,
    fields,
  });
  return toDetail(
    updated,
    await runtime.employees.listDocuments(updated.employeeId),
    runtime.storage,
    runtime.storageBucket,
    runtime.piiKey,
  );
}

export async function listPharmacistEligible(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireDutyPlan(runtime, input, pharmacy.locationId);
  requirePharmacistEligiblePermission(actor);
  const items = await runtime.employees.listPharmacistEligible(
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  return {
    items: items.map((row) => ({
      employee_id: row.employeeId,
      full_name: row.fullName,
      pharmacist_registration_no: row.pharmacistRegistrationNo,
      pharmacist_registration_expiry: row.pharmacistRegistrationExpiry,
    })),
  };
}

export async function exportCsv(
  runtime: EmployeesRuntime,
  input: AuthedRequest,
): Promise<RawHttpBody> {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const result = await runtime.employees.listEmployees({
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    ...listFilters(input),
    page: 1,
    pageSize: 100,
  });
  const header = [
    'employee_code',
    'full_name',
    'phone',
    'email',
    'position',
    'status',
    'join_date',
    'pharmacist_registration_no',
    'user_id',
    'pan',
    'aadhaar_masked',
    'bank_ifsc',
    'bank_upi_id',
  ];
  const lines = [header.join(',')];
  for (const row of result.items) {
    const pan = decryptOptional(row.panCiphertext, runtime.piiKey);
    const aadhaar = decryptOptional(row.aadhaarCiphertext, runtime.piiKey);
    lines.push(
      [
        row.employeeCode,
        row.fullName,
        row.phone,
        row.email ?? '',
        row.position,
        row.status,
        row.joinDate ?? '',
        row.pharmacistRegistrationNo ?? '',
        row.userId ?? '',
        pan ?? '',
        maskAadhaar(aadhaar) ?? '',
        row.bankIfsc ?? '',
        row.bankUpiId ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return {
    body: `\uFEFF${lines.join('\n')}\n`,
    contentType: 'text/csv; charset=utf-8',
    filename: 'employees.csv',
  };
}

export async function deleteEmployee(): Promise<never> {
  throw EmployeesErrors.methodNotAllowed();
}

export async function createPhotoUploadUrl(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const body = readBody(input);
  const contentType = requiredString(body.content_type, 'content_type');
  const byteSize = Number(body.byte_size);
  if (
    !PHOTO_TYPES.has(contentType) ||
    !Number.isFinite(byteSize) ||
    byteSize <= 0 ||
    byteSize > 5_000_000
  ) {
    throw EmployeesErrors.validationError('photo must be jpeg/png/webp up to 5 MB');
  }
  const objectKey = `tenants/${pharmacy.tenantId}/employees/${employee.employeeId}/photo`;
  return runtime.storage.presignPut({
    bucket: runtime.storageBucket,
    key: objectKey,
    contentType,
    expiresInSeconds: 600,
    tenantId: pharmacy.tenantId,
  });
}

export async function confirmPhoto(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const objectKey = requiredString(readBody(input).object_key, 'object_key');
  if (!runtime.storage.isIssuedKey(pharmacy.tenantId, objectKey)) {
    throw EmployeesErrors.uploadKeyInvalid();
  }
  const updated = await runtime.employees.updateEmployee(employee.employeeId, {
    photoObjectKey: objectKey,
  });
  await runtime.storage.put({
    bucket: runtime.storageBucket,
    key: objectKey,
    body: 'uploaded',
    contentType: 'image/jpeg',
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'employee.photo.changed',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: employee.employeeId,
    idempotencyKey: `employee.photo:${employee.employeeId}:${runtime.now().toISOString()}`,
  });
  return toDetail(
    updated ?? employee,
    await runtime.employees.listDocuments(employee.employeeId),
    runtime.storage,
    runtime.storageBucket,
    runtime.piiKey,
  );
}

export async function createDocumentUploadUrl(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const body = readBody(input);
  const contentType = requiredString(body.content_type, 'content_type');
  const byteSize = Number(body.byte_size);
  parseDocType(body.type);
  requiredString(body.file_name, 'file_name');
  if (
    !DOC_TYPES.has(contentType) ||
    !Number.isFinite(byteSize) ||
    byteSize <= 0 ||
    byteSize > 10_000_000
  ) {
    throw EmployeesErrors.validationError('document must be pdf/jpeg/png up to 10 MB');
  }
  if ((await runtime.employees.countDocuments(employee.employeeId)) >= 20) {
    throw EmployeesErrors.documentLimit();
  }
  const objectKey = `tenants/${pharmacy.tenantId}/employees/${employee.employeeId}/documents/${crypto.randomUUID()}`;
  return runtime.storage.presignPut({
    bucket: runtime.storageBucket,
    key: objectKey,
    contentType,
    expiresInSeconds: 600,
    tenantId: pharmacy.tenantId,
  });
}

export async function createDocument(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  if ((await runtime.employees.countDocuments(employee.employeeId)) >= 20) {
    throw EmployeesErrors.documentLimit();
  }
  const body = readBody(input);
  const objectKey = requiredString(body.object_key, 'object_key');
  if (!runtime.storage.isIssuedKey(pharmacy.tenantId, objectKey)) {
    throw EmployeesErrors.uploadKeyInvalid();
  }
  const created = await runtime.employees.addDocument({
    employeeId: employee.employeeId,
    type: parseDocType(body.type),
    objectKey,
    fileName: requiredString(body.file_name, 'file_name'),
  });
  await runtime.storage.put({
    bucket: runtime.storageBucket,
    key: objectKey,
    body: 'uploaded',
    contentType: 'application/pdf',
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'employee.document.added',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: employee.employeeId,
    after: { document_id: created.documentId },
    idempotencyKey: `employee.document:${created.documentId}`,
  });
  return {
    document_id: created.documentId,
    type: created.type,
    object_key: created.objectKey,
    file_name: created.fileName,
    uploaded_at: created.uploadedAt.toISOString(),
    download_url:
      runtime.storage.signedGetUrl(runtime.storageBucket, created.objectKey, 600) ?? null,
  };
}

export async function deleteDocument(runtime: EmployeesRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const documentId = parseUuid(String(input.req.params.document_id ?? ''), 'document_id');
  const existing = await runtime.employees.getDocument(employee.employeeId, documentId);
  if (!existing) {
    throw EmployeesErrors.notFound();
  }
  await runtime.employees.deleteDocument(employee.employeeId, documentId);
  await runtime.storage.delete(runtime.storageBucket, existing.objectKey);
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'employee.document.removed',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: employee.employeeId,
    after: { document_id: documentId },
    idempotencyKey: `employee.document.removed:${documentId}`,
  });
  return { deleted: true };
}

export async function getIdCard(
  runtime: EmployeesRuntime,
  input: AuthedRequest,
): Promise<RawHttpBody> {
  const { pharmacy, actor } = await loadActor(runtime, input);
  await requireEmployeesPlan(runtime, input, pharmacy.locationId);
  requireEmployeesPermission(actor);
  const employee = await loadEmployee(
    runtime,
    readEmployeeId(input),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  const location = await runtime.tenancy.getLocationForTenant(pharmacy.tenantId);
  const pdf = await buildIdCardPdf({
    shopName: location?.displayName ?? 'Pharmacy',
    fullName: employee.fullName,
    position: employee.positionLabel ?? employee.position,
    employeeCode: employee.employeeCode,
  });
  return {
    body: Buffer.from(pdf),
    contentType: 'application/pdf',
    filename: `${employee.employeeCode}-id-card.pdf`,
  };
}
