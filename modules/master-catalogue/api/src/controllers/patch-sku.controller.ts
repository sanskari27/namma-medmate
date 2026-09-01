import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';
import { toMasterSku } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { effectiveRxOnly, parsePatchBody, parseSkuId } from '../http/validate.ts';
import { emitAdmin, loadSku, requireHq } from '../http/write.ts';

export function createPatchSkuController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  logger: Logger,
) {
  return async function patchSku(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    const existing = await loadSku(catalogue, id);
    const patch = parsePatchBody(input.req.body);
    const schedule = patch.schedule ?? existing.schedule;
    const rxOnly = effectiveRxOnly(
      schedule,
      patch.rxOnly !== undefined ? patch.rxOnly : existing.rxOnly,
    );
    const updated = await catalogue.updateSku(id, { ...patch, schedule, rxOnly });
    if (!updated) {
      throw MasterCatalogueErrors.notFound();
    }
    logger.info('PlatformMasterSkuUpdated', { platform_master_sku_id: id });
    await emitAdmin(audit, logger, principal, id, { updated: true }, 'update');
    return buildSuccess(toMasterSku(updated));
  };
}
