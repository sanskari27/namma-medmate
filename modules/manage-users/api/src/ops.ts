import { sha256 } from '@namma-medmate/encryption-utils';
import type { UserRecord } from '@namma-medmate/db-services';
import { recordAudit } from './audit/record.ts';
import { copyTempPassword, hashPin, issueTempPassword } from './credentials.ts';
import { ManageUsersErrors } from './errors.ts';
import { requiredPlanForLimit, toSavedDevice, toUserListItem } from './http/mappers.ts';
import { requireManageUsersPermission, requirePharmacyLocation, scopedUser } from './http/scope.ts';
import type { AuthedRequest } from './http/parse-auth.ts';
import { parseUuid } from './http/validate.ts';
import {
  allPermissionsTrue,
  isStaffRole,
  mergePermissions,
  ownerMapIsAllTrue,
  replacePermissions,
  roleDefaultPermissions,
  type StaffRole,
} from './permissions.ts';
import { logSeatsChanged, type ManageUsersRuntime } from './runtime.ts';
import { buildShareLink } from './share-link.ts';

const LOGIN_ID = /^[a-zA-Z0-9._@+-]+$/;
const OTP_MOBILE = /^\+91[6-9]\d{9}$/;
const PIN = /^\d{4,6}$/;

function readBody(req: AuthedRequest): Record<string, unknown> {
  return (req.req.body ?? {}) as Record<string, unknown>;
}

function readUserId(req: AuthedRequest): string {
  return parseUuid(String(req.req.params.user_id ?? ''), 'user_id');
}

export async function loadActor(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const pharmacy = await requirePharmacyLocation(
    input,
    runtime.tenancy,
    input.req.query.location_id,
  );
  const actor = await runtime.auth.findUserById(pharmacy.sub);
  if (!actor || actor.tenantId !== pharmacy.tenantId || actor.removedAt) {
    throw ManageUsersErrors.forbidden();
  }
  return { pharmacy, actor };
}

async function loadTarget(
  runtime: ManageUsersRuntime,
  input: AuthedRequest,
  actorTenant: string,
  locationId: string,
) {
  const user = scopedUser(
    await runtime.auth.findUserById(readUserId(input)),
    actorTenant,
    locationId,
  );
  return user;
}

function parseLoginId(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw ManageUsersErrors.validationError('login_id is required');
  }
  const loginId = raw.trim();
  if (loginId.length < 3 || loginId.length > 64 || !LOGIN_ID.test(loginId)) {
    throw ManageUsersErrors.validationError('login_id must be 3–64 characters [a-zA-Z0-9._@+-]');
  }
  return loginId;
}

function parseOtpMobile(raw: unknown, otpEnabled: boolean): string | null {
  if (!otpEnabled) {
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }
  if (typeof raw !== 'string' || !OTP_MOBILE.test(raw)) {
    throw ManageUsersErrors.otpMobileRequired();
  }
  return raw;
}

function assertAuthMethods(passwordEnabled: boolean, otpEnabled: boolean): void {
  if (!passwordEnabled && !otpEnabled) {
    throw ManageUsersErrors.authMethodRequired();
  }
}

function parsePin(raw: unknown): string {
  if (typeof raw !== 'string' || !PIN.test(raw)) {
    throw ManageUsersErrors.validationError('PIN must be 4–6 digits');
  }
  return raw;
}

function parsePage(raw: unknown, fallback: number): number {
  const value = typeof raw === 'string' ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < 1) {
    return fallback;
  }
  return value;
}

async function requireSeat(
  runtime: ManageUsersRuntime,
  token: string,
  tenantId: string,
  locationId: string,
) {
  const seats = await runtime.planGating.getSeats(token, locationId);
  const activeCount = await runtime.auth.countActiveUsers(tenantId, locationId);
  if (seats.seatLimit !== null && activeCount >= seats.seatLimit) {
    throw ManageUsersErrors.seatCapReached(
      seats.seatLimit,
      activeCount,
      requiredPlanForLimit(seats.seatLimit),
    );
  }
  return { seats, activeCount };
}

async function linkedEmployee(
  runtime: ManageUsersRuntime,
  tenantId: string,
  locationId: string,
  employeeId: string | null,
  exceptUserId?: string,
): Promise<string | null> {
  if (!employeeId) {
    return null;
  }
  const employee = await runtime.employees.getById(employeeId);
  if (!employee || employee.tenantId !== tenantId || employee.locationId !== locationId) {
    throw ManageUsersErrors.validationError('employee_id is not valid for this location');
  }
  const existing = await runtime.auth.findUserByEmployeeId(tenantId, locationId, employeeId);
  if (existing && existing.userId !== exceptUserId) {
    throw ManageUsersErrors.employeeAlreadyLinked();
  }
  return employeeId;
}

export async function getSeats(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy } = await loadActor(runtime, input);
  const seats = await runtime.planGating.getSeats(input.accessToken, pharmacy.locationId);
  const activeCount = await runtime.auth.countActiveUsers(pharmacy.tenantId, pharmacy.locationId);
  return {
    plan: seats.plan,
    seat_limit: seats.seatLimit,
    active_count: activeCount,
    unlimited: seats.seatLimit === null,
  };
}

export async function listUsers(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const roleRaw = input.req.query.role;
  const role =
    typeof roleRaw === 'string' && roleRaw.length > 0
      ? isStaffRole(roleRaw)
        ? roleRaw
        : (() => {
            throw ManageUsersErrors.validationError('role is invalid');
          })()
      : undefined;
  const activeRaw = input.req.query.active;
  const active = activeRaw === 'true' ? true : activeRaw === 'false' ? false : undefined;
  const page = parsePage(input.req.query.page, 1);
  const pageSize = parsePage(input.req.query.page_size, 20);
  const listed = await runtime.auth.listUsers({
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    role,
    active,
    page,
    pageSize,
  });
  const items = [];
  for (const user of listed.items) {
    const devices = await runtime.auth.listSavedDevices(user.userId);
    items.push(toUserListItem(user, devices.length));
  }
  return { items, page, page_size: pageSize, total: listed.total };
}

export async function getUser(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const devices = await runtime.auth.listSavedDevices(user.userId);
  return {
    ...toUserListItem(user, devices.length, true),
    saved_devices: devices.map((item) => toSavedDevice(item)),
  };
}

export async function createUser(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const body = readBody(input);
  const idempotencyKeyHeader = input.req.header('idempotency-key');
  const bodyHash = sha256(JSON.stringify(body));
  if (idempotencyKeyHeader) {
    const existing = await runtime.auth.getIdempotency(pharmacy.tenantId, idempotencyKeyHeader);
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        throw ManageUsersErrors.idempotencyConflict();
      }
      const replay = scopedUser(
        await runtime.auth.findUserById(existing.userId),
        pharmacy.tenantId,
        pharmacy.locationId,
      );
      return toUserListItem(replay, 0, true);
    }
  }
  const loginId = parseLoginId(body.login_id);
  if (typeof body.role !== 'string' || !isStaffRole(body.role) || body.role === 'owner') {
    if (body.role === 'owner') {
      throw ManageUsersErrors.ownerAlreadyExists();
    }
    throw ManageUsersErrors.validationError('role must be manager, pharmacist, or cashier');
  }
  const role = body.role;
  const passwordEnabled = body.password_enabled === true;
  const otpEnabled = body.otp_enabled === true;
  assertAuthMethods(passwordEnabled, otpEnabled);
  const otpMobile = parseOtpMobile(body.otp_mobile, otpEnabled);
  const taken = await runtime.auth.findUserByLoginId(loginId);
  if (taken) {
    throw ManageUsersErrors.loginIdTaken();
  }
  await requireSeat(runtime, input.accessToken, pharmacy.tenantId, pharmacy.locationId);
  const employeeId =
    typeof body.employee_id === 'string'
      ? await linkedEmployee(runtime, pharmacy.tenantId, pharmacy.locationId, body.employee_id)
      : null;
  const pin = typeof body.pin === 'string' ? parsePin(body.pin) : undefined;
  const permissions =
    body.permissions && typeof body.permissions === 'object'
      ? replacePermissions(body.permissions as Record<string, boolean>)
      : roleDefaultPermissions(role);
  let created: UserRecord | undefined;
  try {
    created = await runtime.auth.createUser({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      loginId,
      role,
      passwordEnabled,
      otpEnabled,
      otpMobile,
      employeeId,
      permissions,
      active: true,
    });
    let tempPassword: string | undefined;
    if (passwordEnabled) {
      tempPassword = await issueTempPassword(
        runtime.auth,
        created.userId,
        runtime.tempPasswordKey,
        runtime.randomPassword,
      );
    }
    if (pin) {
      await runtime.auth.setPinHash(created.userId, await hashPin(pin));
    }
    created = scopedUser(
      await runtime.auth.findUserById(created.userId),
      pharmacy.tenantId,
      pharmacy.locationId,
    );
    if (idempotencyKeyHeader) {
      await runtime.auth.putIdempotency({
        tenantId: pharmacy.tenantId,
        idempotencyKey: idempotencyKeyHeader,
        bodyHash,
        userId: created.userId,
      });
    }
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'user.created',
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      targetId: created.userId,
      after: { login_id: created.loginId, role: created.role },
      idempotencyKey: `user.created:${created.userId}`,
    });
    runtime.logger.info('manage-users.user.created', {
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.locationId,
      user_id: created.userId,
      role: created.role,
      actor_user_id: actor.userId,
    });
    const activeCount = await runtime.auth.countActiveUsers(pharmacy.tenantId, pharmacy.locationId);
    const seats = await runtime.planGating.getSeats(input.accessToken, pharmacy.locationId);
    logSeatsChanged(runtime.logger, {
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.locationId,
      active_count: activeCount,
      seat_limit: seats.seatLimit,
    });
    return {
      ...toUserListItem(created, 0, true),
      ...(tempPassword ? { temp_password: tempPassword } : {}),
    };
  } catch (error) {
    if (created) {
      await runtime.auth.softDeleteUser(created.userId, runtime.now());
    }
    throw error;
  }
}

export async function patchUser(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const body = readBody(input);
  if (user.role === 'owner' && (body.role !== undefined || body.active === false)) {
    throw ManageUsersErrors.ownerAccessImmutable();
  }
  let role: StaffRole | undefined;
  if (body.role !== undefined) {
    if (typeof body.role !== 'string' || !isStaffRole(body.role) || body.role === 'owner') {
      throw ManageUsersErrors.validationError('role cannot be owner');
    }
    role = body.role;
  }
  let loginId: string | undefined;
  if (body.login_id !== undefined) {
    loginId = parseLoginId(body.login_id);
    const taken = await runtime.auth.findUserByLoginId(loginId);
    if (taken && taken.userId !== user.userId) {
      throw ManageUsersErrors.loginIdTaken();
    }
  }
  if (body.active === true && !user.active) {
    await requireSeat(runtime, input.accessToken, pharmacy.tenantId, pharmacy.locationId);
  }
  const employeeId =
    body.employee_id === undefined
      ? undefined
      : body.employee_id === null
        ? null
        : await linkedEmployee(
            runtime,
            pharmacy.tenantId,
            pharmacy.locationId,
            String(body.employee_id),
            user.userId,
          );
  const otpMobile =
    body.otp_mobile === undefined ? undefined : parseOtpMobile(body.otp_mobile, user.otpEnabled);
  const updated = await runtime.auth.updateUserProfile(user.userId, {
    loginId,
    role,
    employeeId,
    otpMobile,
    active: typeof body.active === 'boolean' ? body.active : undefined,
  });
  const next = scopedUser(updated, pharmacy.tenantId, pharmacy.locationId);
  if (body.active === false || body.active === true) {
    await recordAudit(runtime.audit, runtime.logger, {
      action: 'user.active.toggled',
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.locationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      targetId: user.userId,
      before: { active: user.active },
      after: { active: next.active },
      idempotencyKey: `user.active:${user.userId}:${runtime.now().toISOString()}`,
    });
    if (body.active === false) {
      runtime.logger.info('manage-users.user.deactivated', {
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.locationId,
        user_id: user.userId,
      });
    }
    const activeCount = await runtime.auth.countActiveUsers(pharmacy.tenantId, pharmacy.locationId);
    const seats = await runtime.planGating.getSeats(input.accessToken, pharmacy.locationId);
    logSeatsChanged(runtime.logger, {
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.locationId,
      active_count: activeCount,
      seat_limit: seats.seatLimit,
    });
  }
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.updated',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { fields: Object.keys(body) },
    idempotencyKey: `user.updated:${user.userId}:${runtime.now().toISOString()}`,
  });
  return toUserListItem(next, (await runtime.auth.listSavedDevices(next.userId)).length, true);
}

export async function putPermissions(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const body = readBody(input);
  const mode = typeof body.mode === 'string' ? body.mode : 'merge';
  let next = roleDefaultPermissions(user.role);
  if (mode === 'reset_defaults') {
    next = roleDefaultPermissions(user.role);
  } else if (mode === 'select_all') {
    next = allPermissionsTrue();
  } else if (mode === 'replace') {
    if (!body.permissions || typeof body.permissions !== 'object') {
      throw ManageUsersErrors.validationError('permissions is required');
    }
    next = replacePermissions(body.permissions as Record<string, boolean>);
  } else {
    if (!body.permissions || typeof body.permissions !== 'object') {
      throw ManageUsersErrors.validationError('permissions is required');
    }
    next = mergePermissions(user.permissions, body.permissions as Record<string, boolean>);
  }
  if (user.role === 'owner' && !ownerMapIsAllTrue(next)) {
    throw ManageUsersErrors.ownerAccessImmutable();
  }
  if (user.role === 'owner') {
    next = allPermissionsTrue();
  }
  const updated = scopedUser(
    await runtime.auth.setPermissions(user.userId, next),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.permissions.changed',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { permissions: next },
    idempotencyKey: `user.permissions:${user.userId}:${runtime.now().toISOString()}`,
  });
  runtime.logger.info('manage-users.user.permissions.changed', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    user_id: user.userId,
    permissions: next,
  });
  return { permissions: next, role: updated.role };
}

export async function putMethods(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const body = readBody(input);
  const passwordEnabled =
    typeof body.password_enabled === 'boolean' ? body.password_enabled : user.passwordEnabled;
  const otpEnabled = typeof body.otp_enabled === 'boolean' ? body.otp_enabled : user.otpEnabled;
  assertAuthMethods(passwordEnabled, otpEnabled);
  const otpMobile = parseOtpMobile(
    body.otp_mobile === undefined ? user.otpMobile : body.otp_mobile,
    otpEnabled,
  );
  const updated = scopedUser(
    await runtime.auth.setMethods(user.userId, { passwordEnabled, otpEnabled, otpMobile }),
    pharmacy.tenantId,
    pharmacy.locationId,
  );
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.methods.changed',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { password_enabled: passwordEnabled, otp_enabled: otpEnabled },
    idempotencyKey: `user.methods:${user.userId}:${runtime.now().toISOString()}`,
  });
  return {
    password_enabled: updated.passwordEnabled,
    otp_enabled: updated.otpEnabled,
    otp_mobile: updated.otpMobile,
  };
}

export async function resetPassword(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const tempPassword = await issueTempPassword(
    runtime.auth,
    user.userId,
    runtime.tempPasswordKey,
    runtime.randomPassword,
  );
  await runtime.auth.setMethods(user.userId, {
    passwordEnabled: true,
    otpEnabled: user.otpEnabled,
    otpMobile: user.otpMobile,
  });
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.password.reset',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    idempotencyKey: `user.password.reset:${user.userId}:${runtime.now().toISOString()}`,
  });
  return { temp_password: tempPassword, temp_password_pending: true };
}

export async function copyPassword(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  try {
    return {
      temp_password: copyTempPassword(user, runtime.tempPasswordKey),
    };
  } catch {
    throw ManageUsersErrors.tempPasswordUnavailable();
  }
}

export async function putPin(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const pin = parsePin(readBody(input).pin);
  await runtime.auth.setPinHash(user.userId, await hashPin(pin));
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.pin.set',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    idempotencyKey: `user.pin.set:${user.userId}:${runtime.now().toISOString()}`,
  });
  return { pin_set: true };
}

export async function deletePin(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  await runtime.auth.setPinHash(user.userId, null);
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.pin.cleared',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    idempotencyKey: `user.pin.cleared:${user.userId}:${runtime.now().toISOString()}`,
  });
  return { pin_set: false };
}

export async function listDevices(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const devices = await runtime.auth.listSavedDevices(user.userId);
  return { items: devices.map((item) => toSavedDevice(item)) };
}

export async function revokeDevice(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const deviceId = parseUuid(String(input.req.params.device_id ?? ''), 'device_id');
  const devices = await runtime.auth.listSavedDevices(user.userId);
  if (!devices.some((item) => item.deviceId === deviceId)) {
    throw ManageUsersErrors.notFound();
  }
  await runtime.auth.revokeSavedDevice(deviceId);
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.devices.revoked',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { device_id: deviceId },
    idempotencyKey: `user.devices.revoked:${user.userId}:${deviceId}`,
  });
  runtime.logger.info('manage-users.user.devices.revoked', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    user_id: user.userId,
    device_id: deviceId,
  });
  return { revoked: true };
}

export async function revokeAllDevices(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  await runtime.auth.revokeAllSavedDevices(user.userId);
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.devices.revoked',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { device_id: 'all' },
    idempotencyKey: `user.devices.revoked:${user.userId}:all:${runtime.now().toISOString()}`,
  });
  runtime.logger.info('manage-users.user.devices.revoked', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    user_id: user.userId,
    device_id: 'all',
  });
  return { revoked: true };
}

export async function shareLink(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  const location = await runtime.tenancy.getLocationForTenant(pharmacy.tenantId);
  let tempPassword: string | undefined;
  if (user.tempPasswordPending && user.tempPasswordCiphertext) {
    tempPassword = copyTempPassword(user, runtime.tempPasswordKey);
  }
  return buildShareLink({
    shopName: location?.displayName ?? 'Namma MedMate',
    loginId: user.loginId,
    tempPassword,
  });
}

export async function removeUser(runtime: ManageUsersRuntime, input: AuthedRequest) {
  const { pharmacy, actor } = await loadActor(runtime, input);
  requireManageUsersPermission(actor);
  const user = await loadTarget(runtime, input, pharmacy.tenantId, pharmacy.locationId);
  if (user.role === 'owner') {
    throw ManageUsersErrors.ownerRequired();
  }
  const employeeId = user.employeeId;
  await runtime.auth.revokeSessionsForUser(user.userId, runtime.now());
  await runtime.auth.revokeAllSavedDevices(user.userId);
  await runtime.auth.softDeleteUser(user.userId, runtime.now());
  await recordAudit(runtime.audit, runtime.logger, {
    action: 'user.removed',
    tenantId: pharmacy.tenantId,
    locationId: pharmacy.locationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    targetId: user.userId,
    after: { employee_id: employeeId },
    idempotencyKey: `user.removed:${user.userId}`,
  });
  runtime.logger.info('manage-users.user.removed', {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    user_id: user.userId,
    employee_id: employeeId,
  });
  const activeCount = await runtime.auth.countActiveUsers(pharmacy.tenantId, pharmacy.locationId);
  const seats = await runtime.planGating.getSeats(input.accessToken, pharmacy.locationId);
  logSeatsChanged(runtime.logger, {
    tenant_id: pharmacy.tenantId,
    location_id: pharmacy.locationId,
    active_count: activeCount,
    seat_limit: seats.seatLimit,
  });
  return {};
}
