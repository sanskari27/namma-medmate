import type { Logger } from '@namma-medmate/logger';
import type { GoLiveKycAuditClient, GoLiveKycAuditEvent } from './client.ts';

export async function recordAudit(
  audit: GoLiveKycAuditClient,
  logger: Logger,
  event: GoLiveKycAuditEvent,
): Promise<void> {
  try {
    await audit.ingest(event);
  } catch {
    logger.warn('AuditIngestFailed', { target_id: event.targetId, action: event.action });
  }
}
