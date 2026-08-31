import type { AuditRepository, TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireService } from '../auth/principal.ts';
import { AuditErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import {
  MONEY_OR_STOCK_ACTIONS,
  assertNoSecrets,
  assertSnapshotSize,
  ingestBodySchema,
} from '../http/validate.ts';
import { resolveLocation } from '../tenancy/resolve-location.ts';

export function createIngestEventController(
  events: AuditRepository,
  tenancy: TenancyRepository,
  logger: Logger,
) {
  return async function ingestEvent(input: AuthedRequest) {
    requireService(input.principal);
    const parsed = ingestBodySchema.safeParse(input.req.body ?? {});
    if (!parsed.success) {
      throw AuditErrors.validationFailed();
    }
    const body = parsed.data;
    if (body.actor_user_id.trim().length === 0 || body.actor_role.trim().length === 0) {
      throw AuditErrors.actorRequired();
    }
    const tenantId = body.tenant_id ?? null;
    const locationId = body.location_id ?? null;
    if (tenantId && !locationId) {
      throw AuditErrors.locationIdRequired();
    }
    if (locationId && !tenantId) {
      throw AuditErrors.validationFailed('tenant_id is required with location_id');
    }
    if (tenantId && locationId) {
      await resolveLocation(tenancy, tenantId, locationId);
    }
    if (MONEY_OR_STOCK_ACTIONS.has(body.action) && !body.money_or_stock) {
      throw AuditErrors.moneyOrStockRequired();
    }
    if (body.money_or_stock && (body.before == null || body.after == null)) {
      throw AuditErrors.beforeAfterRequired();
    }
    assertSnapshotSize(body.before);
    assertSnapshotSize(body.after);
    assertNoSecrets(body.before, body.after);
    const result = await events.insertEvent({
      idempotencyKey: body.idempotency_key,
      tenantId,
      locationId,
      actorUserId: body.actor_user_id,
      actorRole: body.actor_role,
      actorSurface: body.actor_surface,
      action: body.action,
      targetType: body.target_type,
      targetId: body.target_id,
      moneyOrStock: body.money_or_stock,
      before: body.before,
      after: body.after,
      clientOccurredAt: body.client_occurred_at ? new Date(body.client_occurred_at) : null,
      requestId: body.request_id,
    });
    logger.info('AuditEventRecorded', {
      audit_event_id: result.record.auditEventId,
      tenant_id: result.record.tenantId,
      location_id: result.record.locationId,
      action: result.record.action,
      target_type: result.record.targetType,
      target_id: result.record.targetId,
      occurred_at: result.record.occurredAt.toISOString(),
    });
    return buildSuccess({
      audit_event_id: result.record.auditEventId,
      occurred_at: result.record.occurredAt.toISOString(),
      deduped: result.deduped,
    });
  };
}
