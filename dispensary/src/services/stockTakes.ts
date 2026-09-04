import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type StockTakeStatus = 'OPEN' | 'POSTED' | 'CANCELLED';

export type StockTakeLine = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  expiresOn: string | null;
  expectedQuantity: number;
  countedQuantity: number | null;
  countedAt: string | null;
  countedByUserId: string | null;
  adjustmentId: string | null;
  varianceQuantity: number | null;
  direction: 'IN' | 'OUT' | null;
};

export type StockTake = {
  id: string;
  branchId: string;
  status: StockTakeStatus;
  startedByUserId: string;
  postedByUserId: string | null;
  cancelledByUserId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
  lines: StockTakeLine[];
};

export type StockTakeScope = 'open' | 'history';

export async function listStockTakes(scope: StockTakeScope = 'open'): Promise<StockTake[]> {
  const { data } = await apiClient.get<{ items: StockTake[] }>(API.STOCK_TAKES, {
    params: { scope },
  });
  return data.items;
}

export async function startStockTake(idempotencyKey: string): Promise<StockTake> {
  const { data } = await apiClient.post<StockTake>(API.STOCK_TAKES, { idempotencyKey });
  return data;
}

export async function saveStockTakeCounts(
  id: string,
  lines: Array<{ lineId: string; countedQuantity: number }>,
): Promise<StockTake> {
  const { data } = await apiClient.post<StockTake>(API.stockTakeCounts(id), { lines });
  return data;
}

export async function postStockTake(id: string): Promise<StockTake> {
  const { data } = await apiClient.post<StockTake>(API.stockTakePost(id));
  return data;
}

export async function cancelStockTake(id: string): Promise<StockTake> {
  const { data } = await apiClient.post<StockTake>(API.stockTakeCancel(id));
  return data;
}
