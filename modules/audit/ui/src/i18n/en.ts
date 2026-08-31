import type { Messages } from '@namma-medmate/i18n';

export const auditMessages = {
  'audit.table.time': 'Time',
  'audit.table.actor': 'Actor',
  'audit.table.role': 'Role',
  'audit.table.action': 'Action',
  'audit.table.target': 'Target',
  'audit.table.before': 'Before',
  'audit.table.after': 'After',
  'audit.table.tenant': 'Tenant',
  'audit.table.empty': 'No audit events yet.',
  'audit.table.error': 'Could not load the audit trail.',
  'audit.errors.validationFailed': 'Validation failed',
  'audit.errors.locationIdRequired': 'location_id is required',
  'audit.errors.locationNotFound': 'Location not found',
  'audit.errors.locationTenantMismatch': 'Location does not belong to this pharmacy',
  'audit.errors.beforeAfterRequired': 'before and after snapshots are required',
  'audit.errors.secretKeyForbidden': 'Secret keys are not allowed in snapshots',
  'audit.errors.actorRequired': 'actor_user_id and actor_role are required',
  'audit.errors.payloadTooLarge': 'Snapshot exceeds 64 KiB',
  'audit.errors.invalidRange': 'from must be before to',
  'audit.errors.moneyOrStockRequired': 'This action requires money_or_stock=true',
  'audit.errors.notFound': 'Audit event not found',
  'audit.errors.unauthorized': 'Unauthorized',
  'audit.errors.pharmacySessionRequired': 'A pharmacy session is required',
  'audit.errors.forbidden': 'A pharmacy or HQ principal is required',
  'audit.errors.serviceOnly': 'Ingest is service-to-service only',
} as const satisfies Messages;

export type AuditMessageKey = keyof typeof auditMessages;
