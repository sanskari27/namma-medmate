export interface InventoryMapping {
  tenantId: string;
  locationId: string;
}

export interface InventoryMappingsClient {
  listMappings(platformMasterSkuId: string): Promise<InventoryMapping[]>;
  unmapPlatform(platformMasterSkuId: string): Promise<void>;
}

export class MemoryInventoryClient implements InventoryMappingsClient {
  readonly mappings = new Map<string, InventoryMapping[]>();
  readonly unmapped: string[] = [];
  failUnmap = false;

  async listMappings(platformMasterSkuId: string): Promise<InventoryMapping[]> {
    return this.mappings.get(platformMasterSkuId) ?? [];
  }

  async unmapPlatform(platformMasterSkuId: string): Promise<void> {
    if (this.failUnmap) {
      throw new Error('inventory unavailable');
    }
    this.unmapped.push(platformMasterSkuId);
    this.mappings.delete(platformMasterSkuId);
  }
}
