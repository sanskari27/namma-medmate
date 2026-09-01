import type {
  MasterCatalogueRepository,
  PlatformMasterSkuRecord,
} from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { requireHq, type HqPrincipal } from '../auth/principal.ts';
import { recordAdminAction } from '../audit/record.ts';
import type { AuditIngestClient } from '../audit/client.ts';
import { MasterCatalogueErrors } from '../errors.ts';

function hqActor(principal: HqPrincipal) {
  return { actorUserId: principal.sub, actorRole: 'Ops' };
}

export async function emitAdmin(
  audit: AuditIngestClient,
  logger: Logger,
  principal: HqPrincipal,
  targetId: string,
  after: Record<string, unknown>,
  action: string,
): Promise<void> {
  const actor = hqActor(principal);
  await recordAdminAction(audit, logger, {
    actorUserId: actor.actorUserId,
    actorRole: actor.actorRole,
    targetId,
    after,
    idempotencyKey: `master-catalogue:${action}:${targetId}`,
  });
}

export async function loadSku(
  catalogue: MasterCatalogueRepository,
  id: string,
): Promise<PlatformMasterSkuRecord> {
  const record = await catalogue.getById(id);
  if (!record) {
    throw MasterCatalogueErrors.notFound();
  }
  return record;
}

export { requireHq };
