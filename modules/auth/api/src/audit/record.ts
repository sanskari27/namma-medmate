import type { Logger } from '@namma-medmate/logger';
import type { AuthAuditClient, AuthAuditEvent } from './client.ts';

export async function recordAudit(
  audit: AuthAuditClient,
  logger: Logger,
  event: AuthAuditEvent,
): Promise<void> {
  try {
    await audit.ingest(event);
  } catch {
    logger.warn('AuditIngestFailed', { target_id: event.targetId, action: event.action });
  }
}
