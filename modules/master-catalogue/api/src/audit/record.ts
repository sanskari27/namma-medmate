import type { Logger } from '@namma-medmate/logger';
import type { AdminActionInput, AuditIngestClient } from './client.ts';

export async function recordAdminAction(
  audit: AuditIngestClient,
  logger: Logger,
  input: AdminActionInput,
): Promise<void> {
  try {
    await audit.ingestAdminAction(input);
  } catch {
    logger.warn('AuditIngestFailed', { target_id: input.targetId });
  }
}
