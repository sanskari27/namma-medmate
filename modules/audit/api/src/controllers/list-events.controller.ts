import type { AuditRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireQueryPrincipal } from '../auth/principal.ts';
import { AuditErrors } from '../errors.ts';
import { toAuditEvent } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { resolveQueryScope } from '../http/scope.ts';
import { parseLimit, parseOptionalDate } from '../http/validate.ts';

export function createListEventsController(events: AuditRepository) {
  return async function listEvents(input: AuthedRequest) {
    requireQueryPrincipal(input.principal);
    const scope = resolveQueryScope(
      input.principal,
      input.req.query.tenant_id,
      input.req.query.location_id,
    );
    const from = parseOptionalDate(input.req.query.from, 'from');
    const to = parseOptionalDate(input.req.query.to, 'to');
    if (from && to && from > to) {
      throw AuditErrors.invalidRange();
    }
    const page = await events.listEvents({
      tenantId: scope.tenantId,
      locationId: scope.locationId,
      platformOnly: scope.platformOnly,
      actorUserId:
        typeof input.req.query.actor_user_id === 'string'
          ? input.req.query.actor_user_id
          : undefined,
      action: typeof input.req.query.action === 'string' ? input.req.query.action : undefined,
      targetType:
        typeof input.req.query.target_type === 'string' ? input.req.query.target_type : undefined,
      targetId:
        typeof input.req.query.target_id === 'string' ? input.req.query.target_id : undefined,
      from,
      to,
      limit: parseLimit(input.req.query.limit),
      cursor: typeof input.req.query.cursor === 'string' ? input.req.query.cursor : undefined,
    });
    return buildSuccess({
      items: page.items.map(toAuditEvent),
      next_cursor: page.nextCursor,
    });
  };
}
