import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type StockTransferDirection = 'PUSH' | 'PULL';
export type StockTransferStatus =
  'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type StockTransferLine = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId: string | null;
  quantity: number;
};

export type StockTransfer = {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  direction: StockTransferDirection;
  status: StockTransferStatus;
  lines: StockTransferLine[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateStockTransferInput = {
  direction: StockTransferDirection;
  counterpartyBranchId: string;
  lines: Array<{ productId: string; batchId?: string | null; quantity: number }>;
  idempotencyKey: string;
};

export type StockTransferScope = 'outgoing' | 'incoming' | 'history' | 'all';

export async function listStockTransfers(scope?: StockTransferScope): Promise<StockTransfer[]> {
  const { data } = await apiClient.get<{ items: StockTransfer[] }>(API.STOCK_TRANSFERS, {
    params: scope ? { scope } : undefined,
  });
  return data.items;
}

export async function getStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await apiClient.get<StockTransfer>(API.stockTransfer(id));
  return data;
}

export async function createStockTransfer(input: CreateStockTransferInput): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(API.STOCK_TRANSFERS, input);
  return data;
}

export async function dispatchStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(API.stockTransferDispatch(id));
  return data;
}

export async function confirmStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(API.stockTransferConfirm(id));
  return data;
}

export async function rejectStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(API.stockTransferReject(id));
  return data;
}

export async function cancelStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(API.stockTransferCancel(id));
  return data;
}
