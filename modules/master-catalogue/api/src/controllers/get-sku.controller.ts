import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireReadable } from '../auth/principal.ts';
import { toDetail } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseSkuId } from '../http/validate.ts';
import { loadSku } from '../http/write.ts';

export function createGetSkuController(catalogue: MasterCatalogueRepository) {
  return async function getSku(input: AuthedRequest) {
    requireReadable(input.principal);
    const id = parseSkuId(input.req.params);
    const record = await loadSku(catalogue, id);
    const substitutes = await catalogue.listSubstitutes(id);
    return buildSuccess(toDetail(record, substitutes));
  };
}
