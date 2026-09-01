import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { toListItem } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import {
  parseLimit,
  parseOptionalBoolean,
  parseOptionalGstSlab,
  parseOptionalSchedule,
  parseOptionalString,
} from '../http/validate.ts';
import { requireHq } from '../http/write.ts';

export function createListSkusController(catalogue: MasterCatalogueRepository) {
  return async function listSkus(input: AuthedRequest) {
    requireHq(input.principal);
    const query = input.req.query;
    const page = await catalogue.listSkus({
      category: parseOptionalString(query.category),
      schedule: parseOptionalSchedule(query.schedule),
      gstSlab: parseOptionalGstSlab(query.gst_slab),
      rxOnly: parseOptionalBoolean(query.rx_only),
      banned: parseOptionalBoolean(query.banned),
      q: parseOptionalString(query.q),
      cursor: parseOptionalString(query.cursor),
      limit: parseLimit(query.limit),
    });
    return buildSuccess({
      items: page.items.map(toListItem),
      next_cursor: page.nextCursor,
    });
  };
}
