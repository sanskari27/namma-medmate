import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type StockAdjustmentReason =
  'DAMAGE_BREAKAGE' | 'EXPIRY_WRITE_OFF' | 'THEFT_LOSS' | 'PHYSICAL_COUNT' | 'SAMPLE_FREE_GOODS';

export type StockAdjustmentDirection = 'IN' | 'OUT';

export type StockAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type StockAdjustment = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  reason: StockAdjustmentReason;
  quantity: number;
  direction: StockAdjustmentDirection;
  status: StockAdjustmentStatus;
  requesterUserId: string;
  approverUserId: string | null;
  approvalRequestId: string;
  version: number;
  createdAt: string;
  decidedAt: string | null;
};

export type StockAdjustmentInput = {
  productId: string;
  batchId?: string | null;
  reason: StockAdjustmentReason;
  quantity: number;
  direction?: StockAdjustmentDirection;
  idempotencyKey: string;
};

export type StockAdjustmentDecision = {
  outcome: 'APPROVED' | 'REJECTED';
  expectedVersion: number;
  note?: string | null;
};

export async function listStockAdjustments(
  scope: 'pending' | 'history' = 'pending',
): Promise<StockAdjustment[]> {
  const { data } = await apiClient.get<{ items: StockAdjustment[] }>(API.INVENTORY_ADJUSTMENTS, {
    params: { scope },
  });
  return data.items;
}

export async function createStockAdjustment(input: StockAdjustmentInput): Promise<StockAdjustment> {
  const { data } = await apiClient.post<StockAdjustment>(API.INVENTORY_ADJUSTMENTS, input);
  return data;
}

export async function decideStockAdjustment(
  id: string,
  decision: StockAdjustmentDecision,
): Promise<StockAdjustment> {
  const { data } = await apiClient.post<StockAdjustment>(
    API.inventoryAdjustmentDecide(id),
    decision,
  );
  return data;
}
