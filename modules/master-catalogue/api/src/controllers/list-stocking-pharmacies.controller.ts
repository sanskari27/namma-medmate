import type { MasterCatalogueRepository, TenancyRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import type { InventoryMappingsClient } from '../inventory/client.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseSkuId } from '../http/validate.ts';
import { loadSku, requireHq } from '../http/write.ts';

export function createListStockingPharmaciesController(
  catalogue: MasterCatalogueRepository,
  inventory: InventoryMappingsClient,
  tenancy: TenancyRepository,
) {
  return async function listStockingPharmacies(input: AuthedRequest) {
    requireHq(input.principal);
    const id = parseSkuId(input.req.params);
    await loadSku(catalogue, id);
    const mappings = await inventory.listMappings(id);
    const items: { tenant_id: string; location_id: string; display_name: string }[] = [];
    for (const mapping of mappings) {
      const pharmacy = await tenancy.getPharmacyByTenantId(mapping.tenantId);
      if (!pharmacy || pharmacy.location.locationId !== mapping.locationId) {
        continue;
      }
      items.push({
        tenant_id: mapping.tenantId,
        location_id: mapping.locationId,
        display_name: pharmacy.location.displayName,
      });
    }
    return buildSuccess({ items });
  };
}
