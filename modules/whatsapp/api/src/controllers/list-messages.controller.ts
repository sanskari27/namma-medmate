import { buildSuccess } from '@namma-medmate/response-envelope';
import type {
  WhatsAppRepository,
  WhatsAppStatus,
  WhatsAppTemplateKey,
} from '@namma-medmate/db-services';
import { inboxPreview } from '../catalogue.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';
import { limitSchema } from '../http/validate.ts';

export function createListMessagesController(messages: WhatsAppRepository) {
  return async function listMessages(input: AuthedRequest) {
    const { tenantId, locationId } = requirePharmacyLocation(
      input.principal,
      input.req.query.location_id,
    );
    const limit = limitSchema.parse(input.req.query.limit);
    const cursor = typeof input.req.query.cursor === 'string' ? input.req.query.cursor : undefined;
    const status =
      typeof input.req.query.status === 'string'
        ? (input.req.query.status as WhatsAppStatus)
        : undefined;
    const templateKey =
      typeof input.req.query.template_key === 'string'
        ? (input.req.query.template_key as WhatsAppTemplateKey)
        : undefined;
    const page = await messages.listInbox({
      tenantId,
      locationId,
      status,
      templateKey,
      limit,
      cursor,
    });
    return buildSuccess({
      items: page.items.map((row) => {
        const shopName =
          typeof row.paramsRedacted.shop_name === 'string' ? row.paramsRedacted.shop_name : '';
        return {
          message_id: row.messageId,
          template_key: row.templateKey,
          to: row.to,
          purpose: row.purpose,
          status: row.status,
          bill_id: row.billId,
          mandatory: row.mandatory,
          retry_count: row.retryCount,
          created_at: row.createdAt.toISOString(),
          preview: inboxPreview(row.templateKey, shopName),
        };
      }),
      next_cursor: page.nextCursor,
    });
  };
}
