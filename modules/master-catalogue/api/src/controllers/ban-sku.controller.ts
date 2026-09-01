import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';
import type { InventoryMappingsClient } from '../inventory/client.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseSkuId } from '../http/validate.ts';
import { emitAdmin, loadSku, requireHq } from '../http/write.ts';

export function createBanSkuController(
  catalogue: MasterCatalogueRepository,
  audit: AuditIngestClient,
  inventory: InventoryMappingsClient,
  logger: Logger,
) {
  return async function banSku(input: AuthedRequest) {
    const principal = requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const reason = String((input.req.body as { reason?: unknown } | undefined)?.reason ?? '');
    const banned = await catalogue.ban(id, principal.sub);
    if (!banned) {
      throw MasterCatalogueErrors.notFound();
    }
    logger.info('PlatformMasterSkuBanned', { platform_master_sku_id: id });
    try {
      await inventory.unmapPlatform(id);
    } catch {
      logger.warn('InventoryUnmapFailed', { platform_master_sku_id: id });
    }
    await emitAdmin(audit, logger, principal, id, { banned: true, reason }, 'ban');
    return buildSuccess({
      platform_master_sku_id: banned.platformMasterSkuId,
      banned: true as const,
    });
  };
}
