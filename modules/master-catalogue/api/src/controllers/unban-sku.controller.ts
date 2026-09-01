import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseSkuId } from '../http/validate.ts';
import { emitAdmin, loadSku, requireHq } from '../http/write.ts';

export function createUnbanSkuController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  logger: Logger,
) {
  return async function unbanSku(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const updated = await catalogue.unban(id);
    if (!updated) {
      throw MasterCatalogueErrors.notFound();
    }
    logger.info('PlatformMasterSkuUnbanned', { platform_master_sku_id: id });
    await emitAdmin(audit, logger, principal, id, { banned: false }, 'unban');
    return buildSuccess({ banned: false as const });
  };
}
