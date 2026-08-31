import type { AuditRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireQueryPrincipal } from '../auth/principal.ts';
import { AuditErrors } from '../errors.ts';
import { toAuditEvent } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { requirePharmacyLocation } from '../http/scope.ts';
import { parseUuid } from '../http/validate.ts';

export function createGetEventController(events: AuditRepository) {
  return async function getEvent(input: AuthedRequest) {
    const principal = requireQueryPrincipal(input.principal);
    const auditEventId = parseUuid(
      typeof input.req.params.audit_event_id === 'string'
        ? input.req.params.audit_event_id
        : undefined,
      'audit_event_id',
    );
    const record = await events.findById(auditEventId);
    if (principal.kind === 'pharmacy') {
      const { tenantId, locationId } = requirePharmacyLocation(
        principal,
        input.req.query.location_id,
      );
      if (!record || record.tenantId !== tenantId || record.locationId !== locationId) {
        throw AuditErrors.notFound();
      }
    } else if (!record) {
      throw AuditErrors.notFound();
    }
    return buildSuccess(toAuditEvent(record));
  };
}
