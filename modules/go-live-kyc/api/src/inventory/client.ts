export interface InventoryClient {
  ingestOpeningStock(input: {
    accessToken: string;
    locationId: string;
    zeroStock?: boolean;
    objectKey?: string;
  }): Promise<{ ingest_id: string }>;
}

export class MemoryInventoryClient implements InventoryClient {
  fail = false;
  last?: { zeroStock?: boolean; objectKey?: string };

  async ingestOpeningStock(input: {
    accessToken: string;
    locationId: string;
    zeroStock?: boolean;
    objectKey?: string;
  }): Promise<{ ingest_id: string }> {
    this.last = { zeroStock: input.zeroStock, objectKey: input.objectKey };
    if (this.fail) {
      throw new Error('inventory unavailable');
    }
    return { ingest_id: 'ingest_memory' };
  }
}

export function createHttpInventoryClient(baseUrl: string): InventoryClient {
  return {
    async ingestOpeningStock(input) {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/inventory/opening-stock?location_id=${encodeURIComponent(input.locationId)}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            location_id: input.locationId,
            zero_stock: input.zeroStock,
            object_key: input.objectKey,
          }),
        },
      );
      if (!response.ok) {
        throw new Error('inventory unavailable');
      }
      const body = (await response.json()) as { data?: { ingest_id?: string } };
      return { ingest_id: body.data?.ingest_id ?? 'ingest_pending' };
    },
  };
}
