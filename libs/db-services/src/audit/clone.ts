import type { AuditEventRecord } from './types.ts';

export function cloneAuditEvent(row: AuditEventRecord): AuditEventRecord {
  return {
    ...row,
    before: row.before ? { ...row.before } : null,
    after: row.after ? { ...row.after } : null,
    occurredAt: new Date(row.occurredAt),
    clientOccurredAt: row.clientOccurredAt ? new Date(row.clientOccurredAt) : null,
    createdAt: new Date(row.createdAt),
  };
}
