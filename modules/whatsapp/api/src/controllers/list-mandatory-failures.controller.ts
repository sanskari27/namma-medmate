import { buildSuccess } from '@namma-medmate/response-envelope';
import type { WhatsAppRepository } from '@namma-medmate/db-services';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';

export function createListMandatoryFailuresController(messages: WhatsAppRepository) {
  return async function listMandatoryFailures(input: AuthedRequest) {
    const { tenantId, locationId } = requirePharmacyLocation(
      input.principal,
      input.req.query.location_id,
    );
    const items = await messages.listMandatoryFailures({ tenantId, locationId });
    return buildSuccess({
      items: items.map((row) => ({
        message_id: row.messageId,
        template_key: row.templateKey,
        bill_id: row.billId,
        status: row.status,
        last_error_code: row.lastErrorCode,
        created_at: row.createdAt.toISOString(),
      })),
    });
  };
}
