import type { AuditEventRecord } from '@namma-medmate/db-services';

export function toAuditEvent(record: AuditEventRecord) {
  return {
    audit_event_id: record.auditEventId,
    tenant_id: record.tenantId,
    location_id: record.locationId,
    actor_user_id: record.actorUserId,
    actor_role: record.actorRole,
    actor_surface: record.actorSurface,
    action: record.action,
    target_type: record.targetType,
    target_id: record.targetId,
    money_or_stock: record.moneyOrStock,
    before: record.before,
    after: record.after,
    occurred_at: record.occurredAt.toISOString(),
  };
}
