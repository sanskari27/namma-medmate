import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { WhatsAppRepository } from '@namma-medmate/db-services';
import { requireOwner } from '../auth/principal.ts';
import { WhatsAppErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';
import { parseUuid } from '../http/validate.ts';

export function createAcknowledgeMessageController(messages: WhatsAppRepository, logger: Logger) {
  return async function acknowledgeMessage(input: AuthedRequest) {
    const owner = requireOwner(input.principal);
    const body = input.req.body as Record<string, unknown>;
    const { locationId } = requirePharmacyLocation(input.principal, body.location_id);
    const messageId = parseUuid(input.req.params.message_id, 'message_id');
    const existing = await messages.findById(messageId);
    if (
      !existing ||
      existing.locationId !== locationId ||
      existing.tenantId !== owner.tenantId ||
      !existing.mandatory ||
      existing.status !== 'failed' ||
      existing.acknowledgedAt
    ) {
      throw WhatsAppErrors.notMandatoryFailure();
    }
    const updated = await messages.acknowledge({
      messageId,
      actorUserId: owner.sub,
      at: new Date(),
    });
    logger.info('WhatsAppMandatoryAcknowledged', {
      message_id: updated.messageId,
      tenant_id: updated.tenantId,
      location_id: updated.locationId,
      actor_user_id: owner.sub,
    });
    return buildSuccess({
      message_id: updated.messageId,
      acknowledged_at: updated.acknowledgedAt?.toISOString(),
    });
  };
}
