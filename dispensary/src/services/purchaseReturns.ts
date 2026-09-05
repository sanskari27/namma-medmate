import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type PurchaseReturnOrigin = 'QC' | 'MANUAL';
export type PurchaseReturnStatus = 'CONFIRMED';

export type PurchaseReturnSummary = {
  id: string;
  debitNoteNumber: string;
  origin: PurchaseReturnOrigin;
  status: PurchaseReturnStatus;
  supplierId: string;
  supplierLegalName: string;
  amountPaise: number;
  createdAt: string;
};

export type PurchaseReturnLine = {
  id: string;
  goodsReceiptLineId: string | null;
  productId: string;
  productName: string;
  sku: string;
  batchId: string | null;
  quantity: number | string;
  unitRatePaise: number;
  amountPaise: number;
  stockMovementId: string | null;
};

export type PurchaseReturnDetail = {
  id: string;
  debitNoteNumber: string;
  origin: PurchaseReturnOrigin;
  status: PurchaseReturnStatus;
  supplierId: string;
  supplierLegalName: string;
  goodsReceiptId: string | null;
  amountPaise: number;
  createdAt: string;
  lines: PurchaseReturnLine[];
};

export type CreatePurchaseReturnInput = {
  goodsReceiptId: string;
  idempotencyKey: string;
  expectedAccountVersion?: number | null;
  lines: Array<{ goodsReceiptLineId: string; quantity: number }>;
};

export async function listPurchaseReturns(): Promise<PurchaseReturnSummary[]> {
  const { data } = await apiClient.get<{ items: PurchaseReturnSummary[] }>(API.PURCHASE_RETURNS);
  return data.items;
}

export async function getPurchaseReturn(id: string): Promise<PurchaseReturnDetail> {
  const { data } = await apiClient.get<PurchaseReturnDetail>(API.purchaseReturn(id));
  return data;
}

export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput,
): Promise<PurchaseReturnDetail> {
  const { data } = await apiClient.post<PurchaseReturnDetail>(API.PURCHASE_RETURNS, input);
  return data;
}
