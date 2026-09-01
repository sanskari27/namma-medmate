import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { toMasterSku } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseCreateBody } from '../http/validate.ts';
import { emitAdmin, requireHq } from '../http/write.ts';

export function createCreateSkuController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  logger: Logger,
) {
  return async function createSku(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const body = parseCreateBody(input.req.body);
    const created = await catalogue.createSku(body);
    logger.info('PlatformMasterSkuCreated', {
      platform_master_sku_id: created.platformMasterSkuId,
    });
    await emitAdmin(
      audit,
      logger,
      principal,
      created.platformMasterSkuId,
      { created: true },
      'create',
    );
    return buildSuccess(toMasterSku(created));
  };
}
