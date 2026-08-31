import type { TenancyRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireHq } from '../auth/principal.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';

export function createListPharmaciesController(repository: TenancyRepository) {
  return async function listPharmacies(input: AuthedRequest) {
    requireHq(input.principal);
    const rawLimit = input.req.query.limit;
    const limit = rawLimit === undefined ? 50 : Number(rawLimit);
    const safeLimit = Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 50;
    const cursor = typeof input.req.query.cursor === 'string' ? input.req.query.cursor : undefined;
    const page = await repository.listPharmacies({ limit: safeLimit, cursor });
    return buildSuccess({
      items: page.items.map((item) => ({
        tenant_id: item.tenantId,
        location_id: item.locationId,
        display_name: item.displayName,
      })),
      next_cursor: page.nextCursor,
    });
  };
}
