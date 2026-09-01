import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireReadable } from '../auth/principal.ts';
import { toSubstitute } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseOptionalBooleanQuery, parseSkuId } from '../http/validate.ts';
import { loadSku } from '../http/write.ts';

export function createGetSubstitutesController(catalogue: MasterCatalogueRepository) {
  return async function getSubstitutes(input: AuthedRequest) {
    requireReadable(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const substitutes = await catalogue.listSubstitutes(
      id,
      parseOptionalBooleanQuery(input.req.query.for_pos),
    );
    return buildSuccess({ items: substitutes.map(toSubstitute) });
  };
}
