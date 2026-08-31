import { buildSuccess } from '@namma-medmate/response-envelope';
import type { SendService } from '../send/send-service.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { resolveScopedPair } from '../http/scope.ts';

export function createSendMessageController(send: SendService) {
  return async function sendMessage(input: AuthedRequest) {
    const body = input.req.body as Record<string, unknown>;
    const { tenantId, locationId } = resolveScopedPair(
      input.principal,
      body.tenant_id,
      body.location_id,
    );
    const result = await send.send({
      tenantId,
      locationId,
      to: String(body.to),
      templateKey: String(body.template_key),
      purpose: body.purpose as never,
      params: (body.params as Record<string, unknown> | undefined) ?? {},
      billId: typeof body.bill_id === 'string' ? body.bill_id : null,
      campaignId: typeof body.campaign_id === 'string' ? body.campaign_id : null,
      idempotencyKey: typeof body.idempotency_key === 'string' ? body.idempotency_key : undefined,
      mandatory: body.mandatory === true,
    });
    return buildSuccess({
      message_id: result.message.messageId,
      tenant_id: result.message.tenantId,
      location_id: result.message.locationId,
      status: result.message.status,
      deduped: result.deduped,
    });
  };
}
