import { createHttpClient } from '@namma-medmate/http-client';
import type { GoLiveKycAuditClient, GoLiveKycAuditEvent } from './client.ts';

export function createHttpAuditClient(baseUrl: string, serviceToken: string): GoLiveKycAuditClient {
  const request = createHttpClient({
    retries: 0,
    fetchImpl: (input, init) => fetch(input, init),
  });
  return {
    async ingest(event: GoLiveKycAuditEvent): Promise<void> {
      await request(`${baseUrl.replace(/\/$/, '')}/audit/events`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${serviceToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: event.idempotencyKey,
          tenant_id: event.tenantId,
          location_id: event.locationId,
          actor_user_id: event.actorUserId,
          actor_role: event.actorRole,
          actor_surface: event.actorSurface,
          action: event.action,
          target_type: 'PharmacyKyc',
          target_id: event.targetId,
          money_or_stock: false,
          before: event.before,
          after: event.after,
        }),
      });
    },
  };
}
