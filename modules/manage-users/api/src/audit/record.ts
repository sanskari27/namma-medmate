import type { Logger } from '@namma-medmate/logger';
import type { ManageUsersAuditClient, ManageUsersAuditEvent } from './client.ts';

export async function recordAudit(
  audit: ManageUsersAuditClient,
  logger: Logger,
  event: ManageUsersAuditEvent,
): Promise<void> {
  try {
    await audit.ingest(event);
  } catch {
    logger.warn('AuditIngestFailed', { target_id: event.targetId, action: event.action });
  }
}
