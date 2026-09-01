import { createHttpClient } from '@namma-medmate/http-client';
import type { Logger } from '@namma-medmate/logger';
import type { AdminActionInput, AuditIngestClient } from './client.ts';

export function createHttpAuditClient(
  baseUrl: string,
  serviceToken: string,
  logger: Logger,
): AuditIngestClient {
  const request = createHttpClient({ retries: 0 });
  return {
    async ingestAdminAction(input: AdminActionInput): Promise<void> {
      await request(`${baseUrl.replace(/\/$/, '')}/audit/events`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${serviceToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: input.idempotencyKey,
          tenant_id: null,
          location_id: null,
          actor_user_id: input.actorUserId,
          actor_role: input.actorRole,
          actor_surface: 'hq',
          action: 'admin_action',
          target_type: 'PlatformMasterSku',
          target_id: input.targetId,
          money_or_stock: false,
          after: input.after,
        }),
      });
      logger.info('AuditIngested', { target_id: input.targetId });
    },
  };
}
