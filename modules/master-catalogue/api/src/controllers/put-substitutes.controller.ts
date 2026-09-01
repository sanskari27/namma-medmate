import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';
import { toSubstitute } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseSkuId, parseSubstituteIds } from '../http/validate.ts';
import { emitAdmin, loadSku, requireHq } from '../http/write.ts';

export function createPutSubstitutesController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  logger: Logger,
) {
  return async function putSubstitutes(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const substituteIds = parseSubstituteIds(input.req.body, id);
    const found = await catalogue.getByIds(substituteIds);
    if (found.length !== substituteIds.length) {
      throw MasterCatalogueErrors.validationFailed('Unknown substitute id');
    }
    if (found.some((row) => row.banned)) {
      throw MasterCatalogueErrors.validationFailed('Banned SKUs cannot be added as substitutes');
    }
    const substitutes = await catalogue.replaceSubstitutes(id, substituteIds);
    logger.info('SubstitutesUpdated', {
      platform_master_sku_id: id,
      substitute_ids: substituteIds,
    });
    await emitAdmin(audit, logger, principal, id, { substitute_ids: substituteIds }, 'substitutes');
    return buildSuccess({ items: substitutes.map(toSubstitute) });
  };
}
