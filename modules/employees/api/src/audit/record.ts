import type { Logger } from '@namma-medmate/logger';
import type { EmployeesAuditClient, EmployeesAuditEvent } from './client.ts';

export async function recordAudit(
  audit: EmployeesAuditClient,
  logger: Logger,
  event: EmployeesAuditEvent,
): Promise<void> {
  try {
    await audit.ingest(event);
  } catch {
    logger.warn('AuditIngestFailed', { target_id: event.targetId, action: event.action });
  }
}
