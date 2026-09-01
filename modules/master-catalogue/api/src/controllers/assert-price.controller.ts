import type { MasterCatalogueRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireReadable } from '../auth/principal.ts';
import { moneyToCents } from '../http/money.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseAssertPriceBody, parseSkuId } from '../http/validate.ts';
import { loadSku } from '../http/write.ts';

export function createAssertPriceController(catalogue: MasterCatalogueRepository) {
  return async function assertPrice(input: AuthedRequest) {
    requireReadable(input.principal);
    const id = parseSkuId(input.req.params);
    const record = await loadSku(catalogue, id);
    const unitPrice = parseAssertPriceBody(input.req.body);
    if (record.banned) {
      return buildSuccess({
        allowed: false,
        banned: true,
        dpco_ceiling: record.dpcoCeiling,
        reason_code: 'BANNED_SKU' as const,
        i18n_key: 'masterCatalogue.errors.bannedSku',
      });
    }
    if (record.dpcoCeiling !== null && moneyToCents(unitPrice) > moneyToCents(record.dpcoCeiling)) {
      return buildSuccess({
        allowed: false,
        banned: false,
        dpco_ceiling: record.dpcoCeiling,
        reason_code: 'ABOVE_DPCO_CEILING' as const,
        i18n_key: 'masterCatalogue.errors.aboveDpco',
      });
    }
    return buildSuccess({
      allowed: true,
      banned: false,
      dpco_ceiling: record.dpcoCeiling,
      reason_code: null,
      i18n_key: null,
    });
  };
}
