import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type ControlledStockLine = {
  id: string;
  stockMovementId: string;
  productId: string;
  productName: string;
  sku: string;
  scheduleClassification: string | null;
  batchId: string | null;
  batchNumber: string | null;
  expiresOn: string | null;
  quantity: number;
  balanceAfter: number;
  movementType: string;
  createdByUserId: string;
  occurredAt: string;
};

export type ControlledStockVerifyResult = {
  allowed: boolean;
  controlledProductIds: string[];
  schedules: Record<string, string>;
};

export type ControlledStockFilters = {
  schedule?: string;
  productId?: string;
  from?: string;
  to?: string;
};

export async function verifyControlledStock(input: {
  customerId: string;
  doctorId: string;
  prescriptionVerified: boolean;
  prescriptionReference?: string;
  productIds: string[];
}): Promise<ControlledStockVerifyResult> {
  const { data } = await apiClient.post<ControlledStockVerifyResult>(
    API.COMPLIANCE_CONTROLLED_STOCK_VERIFY,
    input,
  );
  return data;
}

export async function listControlledStock(
  filters: ControlledStockFilters = {},
): Promise<ControlledStockLine[]> {
  const { data } = await apiClient.get<{ items: ControlledStockLine[] }>(
    API.COMPLIANCE_CONTROLLED_STOCK,
    { params: filters },
  );
  return data.items;
}

export async function downloadControlledStockExport(
  format: 'csv' | 'ndps',
  filters: ControlledStockFilters = {},
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.COMPLIANCE_CONTROLLED_STOCK_EXPORT, {
    params: { format, ...filters },
    responseType: 'blob',
  });
  return data;
}
