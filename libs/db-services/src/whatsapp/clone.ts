import type { WhatsAppMessageRecord } from './types.ts';

export function cloneWhatsAppMessage(row: WhatsAppMessageRecord): WhatsAppMessageRecord {
  return {
    ...row,
    paramsRedacted: { ...row.paramsRedacted },
    acknowledgedAt: row.acknowledgedAt ? new Date(row.acknowledgedAt) : null,
    leaseExpiresAt: row.leaseExpiresAt ? new Date(row.leaseExpiresAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastAttemptAt: row.lastAttemptAt ? new Date(row.lastAttemptAt) : null,
  };
}
