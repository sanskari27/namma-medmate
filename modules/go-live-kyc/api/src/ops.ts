import { sealSecret, sha256 } from '@namma-medmate/encryption-utils';
import {
  defaultWizardProgress,
  type GoLiveKycRecord,
  type KycStatus,
  type WizardProgress,
  type WizardStepKey,
} from '@namma-medmate/db-services';
import { GoLiveKycErrors } from './errors.ts';
import { recordAudit } from './audit/record.ts';
import {
  requireExisting,
  requireHqLocation,
  requireOwner,
  requirePharmacyLocation,
} from './http/scope.ts';
import { decryptOptional, maskBank, toGate } from './http/mappers.ts';
import { parseUuid, readBody, readLocationId } from './http/validate.ts';
import { requireHq } from './auth/principal.ts';
import type { AuthedRequest } from './http/parse-auth.ts';
import type { GoLiveKycRuntime } from './runtime.ts';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PREFIX = /^[A-Z0-9]{2,10}$/;
const PIN = /^\d{4,6}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function requiredString(value: unknown, _label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw GoLiveKycErrors.kycFieldsIncomplete();
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function requiredBool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw GoLiveKycErrors.validationError(`${label} must be a boolean`);
  }
  return value;
}

function isoDate(value: unknown, label: string): string {
  const raw = requiredString(value, label);
  if (!ISO_DATE.test(raw)) {
    throw GoLiveKycErrors.validationError(`${label} must be YYYY-MM-DD`);
  }
  return raw;
}

function gstinOf(value: unknown): string {
  const raw = requiredString(value, 'gstin');
  if (!GSTIN.test(raw)) {
    throw GoLiveKycErrors.validationError('Invalid GSTIN');
  }
  return raw;
}

function panOf(value: unknown): string {
  const raw = requiredString(value, 'pan');
  if (!PAN.test(raw)) {
    throw GoLiveKycErrors.validationError('Invalid PAN');
  }
  return raw;
}

async function loadPharmacyRow(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const pharmacy = await requirePharmacyLocation(
    input,
    runtime.tenancy,
    input.req.query.location_id,
  );
  const location = await runtime.tenancy.getLocationForTenant(pharmacy.tenantId);
  const row = await runtime.kyc.ensure(
    pharmacy.tenantId,
    pharmacy.locationId,
    location?.displayName ?? 'Pharmacy',
  );
  return { pharmacy, row };
}

async function loadOwnerRow(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const loaded = await loadPharmacyRow(runtime, input);
  requireOwner(loaded.pharmacy);
  return loaded;
}

function stepDone(progress: WizardProgress, key: WizardStepKey, allowSkip: boolean): boolean {
  const status = progress.steps[key]?.status;
  return status === 'completed' || (allowSkip && status === 'skipped');
}

function wizardSatisfied(progress: WizardProgress): boolean {
  return (
    stepDone(progress, '1_profile', false) &&
    stepDone(progress, '2_opening_stock', false) &&
    stepDone(progress, '3_opening_books', true) &&
    stepDone(progress, '4_invoice', false) &&
    stepDone(progress, '5_first_user', true)
  );
}

function touchStep(
  progress: WizardProgress,
  key: WizardStepKey,
  patch: Record<string, unknown>,
  now: Date,
): WizardProgress {
  const next = JSON.parse(JSON.stringify(progress)) as WizardProgress;
  next.steps[key] = {
    ...next.steps[key],
    ...patch,
    updated_at: now.toISOString(),
  } as WizardProgress['steps'][WizardStepKey];
  return next;
}

async function emitGateChanged(
  runtime: GoLiveKycRuntime,
  before: boolean,
  after: GoLiveKycRecord,
): Promise<void> {
  const allowed = toGate(after).allowed;
  if (before !== allowed) {
    runtime.logger.info('go-live-kyc.gate.changed', {
      tenant_id: after.tenantId,
      location_id: after.locationId,
      allowed,
    });
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'go-live-kyc.gate.changed',
      tenantId: after.tenantId,
      locationId: after.locationId,
      actorUserId: 'system',
      actorRole: 'system',
      actorSurface: 'pharmacy',
      targetId: after.tenantId,
      after: { allowed },
      idempotencyKey: `go-live-kyc.gate.changed:${after.tenantId}:${allowed}:${runtime.now().toISOString()}`,
    });
  }
}

async function saveProgress(
  runtime: GoLiveKycRuntime,
  row: GoLiveKycRecord,
  progress: WizardProgress,
  wizardStatus: GoLiveKycRecord['wizardStatus'] = 'in_progress',
): Promise<GoLiveKycRecord> {
  return runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    wizardStatus,
    wizardProgress: progress,
  });
}

export async function getGate(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { row } = await loadPharmacyRow(runtime, input);
  return toGate(row);
}

export async function getStatus(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { row } = await loadOwnerRow(runtime, input);
  const bank = decryptOptional(row.kycBankAccountNumberCiphertext, runtime.piiKey);
  return {
    kyc_status: row.kycStatus,
    wizard_status: row.wizardStatus,
    kyc_reject_reason: row.kycRejectReason,
    gstin: row.kycGstin,
    pan: row.kycPan,
    bank_account_number_masked: maskBank(bank),
    wizard_progress: row.wizardProgress,
    gate: toGate(row),
  };
}

export async function putKyc(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const gstin = gstinOf(body.gstin);
  const pan = panOf(body.pan);
  const drugLicenceNo = requiredString(body.drug_licence_no, 'drug_licence_no');
  const drugLicenceExpiry = isoDate(body.drug_licence_expiry, 'drug_licence_expiry');
  const fssaiNo = optionalString(body.fssai_no);
  const fssaiExpiry = fssaiNo
    ? isoDate(body.fssai_expiry, 'fssai_expiry')
    : optionalString(body.fssai_expiry);
  if (fssaiNo && !fssaiExpiry) {
    throw GoLiveKycErrors.kycFieldsIncomplete();
  }
  const pharmacistName = requiredString(body.pharmacist_name, 'pharmacist_name');
  const pharmacistReg = requiredString(
    body.pharmacist_registration_no,
    'pharmacist_registration_no',
  );
  const pharmacistExpiry = isoDate(
    body.pharmacist_registration_expiry,
    'pharmacist_registration_expiry',
  );
  const eInvoicing = requiredBool(body.e_invoicing_enabled, 'e_invoicing_enabled');
  const holder = requiredString(body.bank_account_holder, 'bank_account_holder');
  const account = requiredString(body.bank_account_number, 'bank_account_number');
  const ifsc = requiredString(body.bank_ifsc, 'bank_ifsc');
  const idempotencyKey = input.req.header('idempotency-key');
  const bodyHash = sha256(JSON.stringify(body));
  if (idempotencyKey) {
    const existing = await runtime.kyc.getIdempotency(
      pharmacy.tenantId,
      pharmacy.locationId,
      idempotencyKey,
    );
    if (existing && existing.bodyHash !== bodyHash) {
      throw GoLiveKycErrors.idempotencyConflict();
    }
    if (existing) {
      return {
        kyc_status: row.kycStatus,
        submitted_at: row.kycSubmittedAt?.toISOString() ?? runtime.now().toISOString(),
      };
    }
  }
  const beforeAllowed = toGate(row).allowed;
  let plan: string | null = row.kycPlan;
  try {
    plan = (await runtime.planGating.getEntitlements(input.accessToken, pharmacy.locationId)).plan;
  } catch {
    plan = row.kycPlan ?? 'free';
  }
  const submittedAt = runtime.now();
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    kycStatus: 'pending',
    kycSubmittedAt: submittedAt,
    kycRejectReason: null,
    kycGstin: gstin,
    kycPan: pan,
    kycDrugLicenceNo: drugLicenceNo,
    kycDrugLicenceIssue: optionalString(body.drug_licence_issue) ?? row.kycDrugLicenceIssue,
    kycDrugLicenceExpiry: drugLicenceExpiry,
    kycFssaiNo: fssaiNo ?? null,
    kycFssaiExpiry: fssaiExpiry ?? null,
    kycPharmacistName: pharmacistName,
    kycPharmacistRegistrationNo: pharmacistReg,
    kycPharmacistRegistrationExpiry: pharmacistExpiry,
    kycEInvoicingEnabled: eInvoicing,
    kycBankAccountHolder: holder,
    kycBankAccountNumberCiphertext: sealSecret(account, runtime.piiKey),
    kycBankIfsc: ifsc,
    kycPlan: plan,
  });
  if (idempotencyKey) {
    await runtime.kyc.putIdempotency({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      idempotencyKey,
      bodyHash,
    });
  }
  runtime.logger.info('go-live-kyc.kyc.submitted', {
    tenant_id: saved.tenantId,
    location_id: saved.locationId,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'go-live-kyc.kyc.submitted',
    tenantId: saved.tenantId,
    locationId: saved.locationId,
    actorUserId: pharmacy.sub,
    actorRole: pharmacy.role,
    actorSurface: 'pharmacy',
    targetId: saved.tenantId,
    after: { kyc_status: 'pending' },
    idempotencyKey: `go-live-kyc.kyc.submitted:${saved.tenantId}:${submittedAt.toISOString()}`,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { kyc_status: saved.kycStatus, submitted_at: submittedAt.toISOString() };
}

export async function getWizard(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { row } = await loadOwnerRow(runtime, input);
  return {
    wizard_status: row.wizardStatus,
    steps: row.wizardProgress.steps,
    gate: toGate(row),
  };
}

export async function putStep1(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const gstin = gstinOf(body.gstin);
  const drugLicenceNo = requiredString(body.drug_licence_no, 'drug_licence_no');
  const identityChanged =
    row.kycStatus === 'approved' &&
    (row.kycGstin !== gstin || row.kycDrugLicenceNo !== drugLicenceNo);
  const fssaiNo = optionalString(body.fssai_no);
  const fssaiExpiry = fssaiNo ? isoDate(body.fssai_expiry, 'fssai_expiry') : undefined;
  const now = runtime.now();
  const progress = touchStep(row.wizardProgress, '1_profile', { status: 'completed' }, now);
  const beforeAllowed = toGate(row).allowed;
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    kycStatus: identityChanged ? 'pending' : row.kycStatus,
    kycSubmittedAt: identityChanged ? now : row.kycSubmittedAt,
    kycGstin: row.kycStatus === 'approved' && !identityChanged ? row.kycGstin : gstin,
    kycDrugLicenceNo:
      row.kycStatus === 'approved' && !identityChanged ? row.kycDrugLicenceNo : drugLicenceNo,
    kycDrugLicenceIssue: optionalString(body.drug_licence_issue) ?? row.kycDrugLicenceIssue,
    kycDrugLicenceExpiry: isoDate(body.drug_licence_expiry, 'drug_licence_expiry'),
    kycFssaiNo: fssaiNo ?? row.kycFssaiNo,
    kycFssaiExpiry: fssaiExpiry ?? row.kycFssaiExpiry,
    kycPharmacistName: requiredString(body.pharmacist_name, 'pharmacist_name'),
    kycPharmacistRegistrationNo: requiredString(
      body.pharmacist_registration_no,
      'pharmacist_registration_no',
    ),
    kycPharmacistRegistrationExpiry: isoDate(
      body.pharmacist_registration_expiry,
      'pharmacist_registration_expiry',
    ),
    kycEInvoicingEnabled: requiredBool(body.e_invoicing_enabled, 'e_invoicing_enabled'),
    wizardStatus: row.wizardStatus === 'completed' ? 'completed' : 'in_progress',
    wizardProgress: progress,
  });
  runtime.logger.info('go-live-kyc.wizard.step.completed', {
    tenant_id: saved.tenantId,
    location_id: saved.locationId,
    step: 1,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'go-live-kyc.wizard.step.completed',
    tenantId: saved.tenantId,
    locationId: saved.locationId,
    actorUserId: saved.tenantId,
    actorRole: 'owner',
    actorSurface: 'pharmacy',
    targetId: saved.tenantId,
    after: { step: '1_profile' },
    idempotencyKey: `go-live-kyc.step.1:${saved.tenantId}:${now.toISOString()}`,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { status: 'completed' };
}

export async function createOpeningStockUploadUrl(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const fileName = requiredString(body.file_name, 'file_name');
  const contentType = requiredString(body.content_type, 'content_type');
  const byteSize = Number(body.byte_size);
  if (contentType !== 'text/csv' || !Number.isFinite(byteSize) || byteSize <= 0) {
    throw GoLiveKycErrors.validationError('Opening stock must be a CSV');
  }
  const objectKey = `tenants/${pharmacy.tenantId}/opening-stock/${fileName}`;
  const issued = await runtime.storage.presignPut({
    bucket: runtime.storageBucket,
    key: objectKey,
    contentType,
    expiresInSeconds: 600,
    tenantId: pharmacy.tenantId,
  });
  return {
    upload_url: issued.uploadUrl,
    object_key: issued.objectKey,
    expires_in_seconds: issued.expiresInSeconds,
  };
}

export async function postStep2(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const zeroStock = body.zero_stock === true;
  const objectKey = optionalString(body.object_key);
  if (!zeroStock && !objectKey) {
    throw GoLiveKycErrors.validationError('Provide zero_stock or object_key');
  }
  if (objectKey && !runtime.storage.isIssuedKey(pharmacy.tenantId, objectKey)) {
    throw GoLiveKycErrors.uploadKeyInvalid();
  }
  const already = row.wizardProgress.steps['2_opening_stock']?.opening_stock_already_posted;
  const now = runtime.now();
  if (already) {
    const progress = touchStep(
      row.wizardProgress,
      '2_opening_stock',
      { status: 'completed', zero_stock: zeroStock, opening_stock_already_posted: true },
      now,
    );
    await saveProgress(runtime, row, progress);
    return { status: 'completed', zero_stock: zeroStock, ingest_id: null };
  }
  if (zeroStock) {
    let ingestId: string | null = 'local-zero';
    try {
      const result = await runtime.inventory.ingestOpeningStock({
        accessToken: input.accessToken,
        locationId: pharmacy.locationId,
        zeroStock: true,
      });
      ingestId = result.ingest_id;
    } catch {
      ingestId = null;
    }
    const progress = touchStep(
      row.wizardProgress,
      '2_opening_stock',
      {
        status: 'completed',
        zero_stock: true,
        ingest_id: ingestId,
        ingest_pending: ingestId === null,
        opening_stock_already_posted: true,
      },
      now,
    );
    await saveProgress(runtime, row, progress);
    runtime.logger.info('go-live-kyc.wizard.step.completed', {
      tenant_id: row.tenantId,
      location_id: row.locationId,
      step: 2,
    });
    return { status: 'completed', zero_stock: true, ingest_id: ingestId };
  }
  try {
    const result = await runtime.inventory.ingestOpeningStock({
      accessToken: input.accessToken,
      locationId: pharmacy.locationId,
      objectKey,
    });
    const progress = touchStep(
      row.wizardProgress,
      '2_opening_stock',
      {
        status: 'completed',
        zero_stock: false,
        ingest_id: result.ingest_id,
        object_key: objectKey,
        opening_stock_already_posted: true,
      },
      now,
    );
    await saveProgress(runtime, row, progress);
    return { status: 'completed', zero_stock: false, ingest_id: result.ingest_id };
  } catch {
    const progress = touchStep(
      row.wizardProgress,
      '2_opening_stock',
      { status: 'in_progress', object_key: objectKey, ingest_pending: true },
      now,
    );
    await saveProgress(runtime, row, progress);
    throw GoLiveKycErrors.openingStockFailed();
  }
}

export async function putStep3(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const startAtZero = body.start_at_zero === true;
  const skipIfPosted = body.skip_if_posted === true;
  const now = runtime.now();
  const already =
    row.wizardProgress.steps['3_opening_books']?.opening_books_already_posted ||
    runtime.books.alreadyPosted;
  if (already && !skipIfPosted && !startAtZero) {
    throw GoLiveKycErrors.openingBooksAlreadyPosted();
  }
  if (already && (skipIfPosted || startAtZero)) {
    const progress = touchStep(
      row.wizardProgress,
      '3_opening_books',
      { status: 'skipped', start_at_zero: true, opening_books_already_posted: true },
      now,
    );
    await saveProgress(runtime, row, progress);
    return { status: 'skipped', start_at_zero: true };
  }
  const cash = startAtZero ? 0 : Number(body.cash_in_till_paise ?? 0);
  if (!Number.isInteger(cash) || cash < 0) {
    throw GoLiveKycErrors.validationError('cash_in_till_paise must be >= 0');
  }
  const khata = Array.isArray(body.opening_khata) ? body.opening_khata : [];
  const ap = Array.isArray(body.opening_ap) ? body.opening_ap : [];
  try {
    const result = await runtime.books.postOpenings({
      accessToken: input.accessToken,
      locationId: pharmacy.locationId,
      startAtZero,
      cashInTillPaise: cash,
      openingKhata: khata,
      openingAp: ap,
    });
    const status = startAtZero ? 'skipped' : 'completed';
    const progress = touchStep(
      row.wizardProgress,
      '3_opening_books',
      {
        status,
        start_at_zero: startAtZero,
        journal_ids: result.journal_ids,
        opening_books_already_posted: true,
      },
      now,
    );
    await saveProgress(runtime, row, progress);
    return { status, start_at_zero: startAtZero };
  } catch (error) {
    if ((error as { code?: string }).code === 'OPENING_BOOKS_ALREADY_POSTED') {
      throw GoLiveKycErrors.openingBooksAlreadyPosted();
    }
    const progress = touchStep(
      row.wizardProgress,
      '3_opening_books',
      { status: 'in_progress' },
      now,
    );
    await saveProgress(runtime, row, progress);
    throw GoLiveKycErrors.openingBooksFailed();
  }
}

export async function putStep4(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const prefix = requiredString(body.invoice_prefix, 'invoice_prefix');
  if (!PREFIX.test(prefix)) {
    throw GoLiveKycErrors.validationError('invoice_prefix must be 2-10 alphanumeric');
  }
  if (body.print_sample_confirmed !== true) {
    throw GoLiveKycErrors.printSampleRequired();
  }
  try {
    await runtime.accountSettings.saveInvoicePrefix({
      accessToken: input.accessToken,
      locationId: pharmacy.locationId,
      invoicePrefix: prefix,
    });
  } catch {
    throw GoLiveKycErrors.validationError('Invoice prefix could not be saved');
  }
  const progress = touchStep(
    row.wizardProgress,
    '4_invoice',
    { status: 'completed', invoice_prefix: prefix, print_sample_confirmed: true },
    runtime.now(),
  );
  await saveProgress(runtime, row, progress);
  return { status: 'completed' };
}

export async function putStep5(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  const body = readBody(input);
  const ownerOnly = requiredBool(body.owner_only, 'owner_only');
  const ownerPin = requiredString(body.owner_pin, 'owner_pin');
  if (!PIN.test(ownerPin)) {
    throw GoLiveKycErrors.validationError('PIN must be 4-6 digits');
  }
  try {
    await runtime.manageUsers.setPin({
      accessToken: input.accessToken,
      locationId: pharmacy.locationId,
      userId: pharmacy.sub,
      pin: ownerPin,
    });
  } catch {
    throw GoLiveKycErrors.validationError('Owner PIN could not be set');
  }
  let createdUserId: string | null = null;
  if (!ownerOnly) {
    const user = body.user;
    if (!user || typeof user !== 'object') {
      throw GoLiveKycErrors.validationError('user is required when adding staff');
    }
    const staff = user as Record<string, unknown>;
    try {
      const created = await runtime.manageUsers.createUser({
        accessToken: input.accessToken,
        locationId: pharmacy.locationId,
        user: {
          login_id: requiredString(staff.login_id, 'login_id'),
          role: requiredString(staff.role, 'role'),
          password_enabled: staff.password_enabled === true,
          otp_enabled: staff.otp_enabled === true,
          pin: optionalString(staff.pin),
        },
      });
      createdUserId = created.user_id;
    } catch (error) {
      if ((error as { code?: string }).code === 'SEAT_CAP_REACHED') {
        throw GoLiveKycErrors.seatCapReached();
      }
      throw GoLiveKycErrors.validationError('Staff user could not be created');
    }
  }
  const status = ownerOnly ? 'skipped' : 'completed';
  const progress = touchStep(
    row.wizardProgress,
    '5_first_user',
    {
      status,
      owner_only: ownerOnly,
      created_user_id: createdUserId,
      owner_pin_set: true,
    },
    runtime.now(),
  );
  await saveProgress(runtime, row, progress);
  return { status, created_user_id: createdUserId };
}

export async function completeWizard(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { pharmacy, row } = await loadOwnerRow(runtime, input);
  if (!wizardSatisfied(row.wizardProgress)) {
    throw GoLiveKycErrors.validationError('Wizard steps are incomplete');
  }
  const beforeAllowed = toGate(row).allowed;
  const now = runtime.now();
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    wizardStatus: 'completed',
    wizardCompletedAt: now,
    wizardProgress: row.wizardProgress,
  });
  runtime.logger.info('go-live-kyc.wizard.completed', {
    tenant_id: saved.tenantId,
    location_id: saved.locationId,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'go-live-kyc.wizard.completed',
    tenantId: saved.tenantId,
    locationId: saved.locationId,
    actorUserId: pharmacy.sub,
    actorRole: pharmacy.role,
    actorSurface: 'pharmacy',
    targetId: saved.tenantId,
    after: { wizard_status: 'completed' },
    idempotencyKey: `go-live-kyc.wizard.completed:${saved.tenantId}:${now.toISOString()}`,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { wizard_status: saved.wizardStatus };
}

export async function rerunWizard(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const { row } = await loadOwnerRow(runtime, input);
  const beforeAllowed = toGate(row).allowed;
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    wizardStatus: 'in_progress',
    wizardProgress: row.wizardProgress,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { wizard_status: saved.wizardStatus };
}

export async function listAdminQueue(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  requireHq(input.principal);
  const statusRaw = typeof input.req.query.status === 'string' ? input.req.query.status : 'pending';
  const status = (
    ['pending', 'approved', 'rejected', 'all'].includes(statusRaw) ? statusRaw : 'pending'
  ) as KycStatus | 'all';
  const page = Math.max(1, Number(input.req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(input.req.query.page_size ?? 20) || 20));
  const result = await runtime.kyc.listQueue({ status, page, pageSize });
  return {
    items: result.items.map((item) => ({
      tenant_id: item.tenantId,
      location_id: item.locationId,
      pharmacy_name: item.pharmacyName,
      gstin: item.kycGstin,
      kyc_status: item.kycStatus,
      submitted_at: item.kycSubmittedAt?.toISOString() ?? null,
      plan: item.kycPlan,
    })),
    page: result.page,
    page_size: result.pageSize,
    total: result.total,
  };
}

export async function getAdminPharmacy(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const scoped = await requireHqLocation(
    input,
    runtime.tenancy,
    String(input.req.params.tenant_id ?? ''),
    input.req.query.location_id,
  );
  const row = requireExisting(
    await runtime.kyc.getByTenantLocation(scoped.tenantId, scoped.locationId),
  );
  const bank = decryptOptional(row.kycBankAccountNumberCiphertext, runtime.piiKey);
  return {
    tenant_id: row.tenantId,
    location_id: row.locationId,
    pharmacy_name: row.pharmacyName,
    kyc_status: row.kycStatus,
    kyc_reject_reason: row.kycRejectReason,
    gstin: row.kycGstin,
    pan: row.kycPan,
    drug_licence_no: row.kycDrugLicenceNo,
    drug_licence_expiry: row.kycDrugLicenceExpiry,
    fssai_no: row.kycFssaiNo,
    pharmacist_name: row.kycPharmacistName,
    e_invoicing_enabled: row.kycEInvoicingEnabled,
    bank_account_holder: row.kycBankAccountHolder,
    bank_account_number_masked: maskBank(bank),
    bank_ifsc: row.kycBankIfsc,
    wizard_status: row.wizardStatus,
  };
}

export async function approveKyc(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const scoped = await requireHqLocation(
    input,
    runtime.tenancy,
    String(input.req.params.tenant_id ?? ''),
    input.req.query.location_id,
  );
  const row = requireExisting(
    await runtime.kyc.ensure(scoped.tenantId, scoped.locationId, scoped.pharmacyName),
  );
  if (row.kycStatus === 'approved') {
    return { kyc_status: 'approved' as const };
  }
  if (row.kycStatus !== 'pending') {
    throw GoLiveKycErrors.kycNotPending();
  }
  const beforeAllowed = toGate(row).allowed;
  const now = runtime.now();
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    kycStatus: 'approved',
    kycDecidedAt: now,
    kycRejectReason: null,
  });
  runtime.logger.info('go-live-kyc.kyc.approved', {
    tenant_id: saved.tenantId,
    location_id: saved.locationId,
    actor_admin_id: scoped.hq.sub,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'go-live-kyc.kyc.approved',
    tenantId: saved.tenantId,
    locationId: saved.locationId,
    actorUserId: scoped.hq.sub,
    actorRole: 'hq',
    actorSurface: 'hq',
    targetId: saved.tenantId,
    after: { kyc_status: 'approved' },
    idempotencyKey: `go-live-kyc.kyc.approved:${saved.tenantId}:${now.toISOString()}`,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { kyc_status: 'approved' as const };
}

export async function rejectKyc(runtime: GoLiveKycRuntime, input: AuthedRequest) {
  const scoped = await requireHqLocation(
    input,
    runtime.tenancy,
    String(input.req.params.tenant_id ?? ''),
    input.req.query.location_id,
  );
  const reason = optionalString(readBody(input).reason);
  if (!reason || reason.length > 500) {
    throw GoLiveKycErrors.validationError('reason is required (1-500 chars)');
  }
  const row = requireExisting(
    await runtime.kyc.ensure(scoped.tenantId, scoped.locationId, scoped.pharmacyName),
  );
  if (row.kycStatus !== 'pending') {
    throw GoLiveKycErrors.kycNotPending();
  }
  const beforeAllowed = toGate(row).allowed;
  const now = runtime.now();
  const saved = await runtime.kyc.save({
    tenantId: row.tenantId,
    locationId: row.locationId,
    pharmacyName: row.pharmacyName,
    kycStatus: 'rejected',
    kycDecidedAt: now,
    kycRejectReason: reason,
  });
  runtime.logger.info('go-live-kyc.kyc.rejected', {
    tenant_id: saved.tenantId,
    location_id: saved.locationId,
    reason,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'go-live-kyc.kyc.rejected',
    tenantId: saved.tenantId,
    locationId: saved.locationId,
    actorUserId: scoped.hq.sub,
    actorRole: 'hq',
    actorSurface: 'hq',
    targetId: saved.tenantId,
    after: { kyc_status: 'rejected', reason },
    idempotencyKey: `go-live-kyc.kyc.rejected:${saved.tenantId}:${now.toISOString()}`,
  });
  await emitGateChanged(runtime, beforeAllowed, saved);
  return { kyc_status: 'rejected' as const, reason };
}

export { parseUuid, wizardSatisfied };
