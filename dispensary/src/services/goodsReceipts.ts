import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type GoodsReceiptQcStatus = 'PENDING_QC' | 'CHECKED';

export type GoodsReceiptSummary = {
  id: string;
  receiptNumber: string;
  receiptReference: string;
  status: GoodsReceiptQcStatus;
  supplierLegalName: string;
  createdAt: string;
  checkedAt: string | null;
};

export type GoodsReceiptQcChecklist = {
  packagingIntact: boolean | null;
  labelMatches: boolean | null;
  batchReadable: boolean | null;
  noDamage: boolean | null;
};

export type GoodsReceiptQcLine = {
  id: string;
  purchaseOrderLineId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number | string;
  unitRatePaise: number;
  requiresBatchTracking: boolean;
  acceptedQuantity: number | string | null;
  rejectedQuantity: number | string | null;
  batchNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  stockMovementId: string | null;
};

export type GoodsReceiptDetail = {
  id: string;
  receiptNumber: string;
  receiptReference: string;
  status: GoodsReceiptQcStatus;
  supplierLegalName: string;
  createdAt: string;
  checkedAt: string | null;
  checkedByUserId: string | null;
  visualInspectionPassed: boolean | null;
  checklist: GoodsReceiptQcChecklist | null;
  purchaseReturnId: string | null;
  debitNoteNumber: string | null;
  lines: GoodsReceiptQcLine[];
};

export type QualityCheckInput = {
  idempotencyKey: string;
  visualInspectionPassed: boolean;
  checklist: {
    packagingIntact: boolean;
    labelMatches: boolean;
    batchReadable: boolean;
    noDamage: boolean;
  };
  lines: Array<{
    goodsReceiptLineId: string;
    acceptedQuantity: number;
    rejectedQuantity: number;
    batchNumber?: string | null;
    manufacturedOn?: string | null;
    expiresOn?: string | null;
  }>;
};

export async function listBranchGoodsReceipts(): Promise<GoodsReceiptSummary[]> {
  const { data } = await apiClient.get<{ items: GoodsReceiptSummary[] }>(API.GOODS_RECEIPTS);
  return data.items;
}

export async function getGoodsReceipt(id: string): Promise<GoodsReceiptDetail> {
  const { data } = await apiClient.get<GoodsReceiptDetail>(API.goodsReceipt(id));
  return data;
}

export async function submitQualityCheck(
  id: string,
  input: QualityCheckInput,
): Promise<GoodsReceiptDetail> {
  const { data } = await apiClient.post<GoodsReceiptDetail>(
    API.goodsReceiptQualityCheck(id),
    input,
  );
  return data;
}
