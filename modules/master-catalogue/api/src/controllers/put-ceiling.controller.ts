import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';
import { toMasterSku } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseCeilingBody, parseSkuId } from '../http/validate.ts';
import { emitAdmin, loadSku, requireHq } from '../http/write.ts';

export function createPutCeilingController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  logger: Logger,
) {
  return async function putCeiling(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const ceiling = parseCeilingBody(input.req.body);
    const updated = await catalogue.setCeiling(id, ceiling);
    if (!updated) {
      throw MasterCatalogueErrors.notFound();
    }
    logger.info('DpcoCeilingSet', {
      platform_master_sku_id: id,
      dpco_ceiling: ceiling,
    });
    await emitAdmin(audit, logger, principal, id, { dpco_ceiling: ceiling }, 'ceiling');
    return buildSuccess(toMasterSku(updated));
  };
}
