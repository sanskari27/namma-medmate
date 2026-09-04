import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type StockBalance = {
  balanceId: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  purchasePricePaise: number | null;
  quantity: number;
  version: number;
};

export type StockBatchDetail = {
  batchId: string | null;
  productId: string;
  batchNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  purchasePricePaise: number;
  quantity: number;
  version: number;
  balanceId: string;
};

export type StockMovement = {
  id: string;
  productId: string;
  batchId: string | null;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  balanceAfter: number;
  purchasePricePaise: number | null;
  occurredAt: string;
};

export type StockReceiptInput = {
  productId: string;
  batchNumber?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  purchasePricePaise?: number | null;
  quantity: number;
  idempotencyKey: string;
  expectedVersion?: number | null;
};

export async function listStockBalances(query?: string): Promise<StockBalance[]> {
  const { data } = await apiClient.get<{ items: StockBalance[] }>(API.INVENTORY_BALANCES, {
    params: query?.trim() ? { q: query.trim() } : undefined,
  });
  return data.items;
}

export async function listStockBatches(productId: string): Promise<StockBatchDetail[]> {
  const { data } = await apiClient.get<{ items: StockBatchDetail[] }>(
    API.inventoryProductBatches(productId),
  );
  return data.items;
}

export async function listStockMovements(params?: {
  productId?: string;
  batchId?: string;
}): Promise<StockMovement[]> {
  const { data } = await apiClient.get<{ items: StockMovement[] }>(API.INVENTORY_MOVEMENTS, {
    params,
  });
  return data.items;
}

export async function receiveStock(input: StockReceiptInput): Promise<StockBalance> {
  const { data } = await apiClient.post<StockBalance>(API.INVENTORY_RECEIPTS, input);
  return data;
}
