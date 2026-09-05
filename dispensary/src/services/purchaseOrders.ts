import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type PurchaseOrderStatus = 'DRAFT' | 'ISSUED' | 'CLOSED' | 'CANCELLED';
export type PurchasePaymentTerms = 'COD' | 'ADVANCE' | 'CREDIT';

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number | string;
  unitRatePaise: number;
  gstRate: number | null;
  lineSubtotalPaise: number;
  lineTaxPaise: number;
  lineTotalPaise: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId: string;
  supplierLegalName: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string | null;
  paymentTerms: PurchasePaymentTerms;
  notes: string | null;
  version: number;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderVersion {
  version: number;
  createdAt: string;
  changedByUserId: string;
  status: PurchaseOrderStatus;
  totalPaise: number;
  snapshot: {
    poNumber?: string;
    status?: string;
    supplierLegalName?: string;
    lines?: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: string;
      unitRatePaise: number;
      lineTotalPaise: number;
    }>;
  };
}

export interface PurchaseOrderLineInput {
  productId: string;
  quantity: number;
  unitRatePaise: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDeliveryDate?: string | null;
  paymentTerms: PurchasePaymentTerms;
  notes?: string;
  idempotencyKey: string;
  lines: PurchaseOrderLineInput[];
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string;
  expectedVersion: number;
  expectedDeliveryDate?: string | null;
  paymentTerms: PurchasePaymentTerms;
  notes?: string;
  lines: PurchaseOrderLineInput[];
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data } = await apiClient.get<{ items: PurchaseOrder[] }>(API.PURCHASE_ORDERS);
  return data.items;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<PurchaseOrder>(API.purchaseOrder(id));
  return data;
}

export async function listPurchaseOrderVersions(id: string): Promise<PurchaseOrderVersion[]> {
  const { data } = await apiClient.get<{ items: PurchaseOrderVersion[] }>(
    API.purchaseOrderVersions(id),
  );
  return data.items;
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(API.PURCHASE_ORDERS, input);
  return data;
}

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch<PurchaseOrder>(API.purchaseOrder(id), input);
  return data;
}

export async function issuePurchaseOrder(
  id: string,
  expectedVersion: number,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(API.purchaseOrderIssue(id), {
    expectedVersion,
  });
  return data;
}

export async function closePurchaseOrder(
  id: string,
  expectedVersion: number,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(API.purchaseOrderClose(id), {
    expectedVersion,
  });
  return data;
}

export async function cancelPurchaseOrder(
  id: string,
  expectedVersion: number,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(API.purchaseOrderCancel(id), {
    expectedVersion,
  });
  return data;
}

export interface UnmappedReorderLine {
  productId: string;
  sku: string;
  name: string;
  suggestedOrderQty: number;
  reason: string;
}

export interface ReorderDraftResult {
  fingerprint: string;
  planCode: string;
  drafts: PurchaseOrder[];
  unmapped: UnmappedReorderLine[];
}

export interface PurchaseOrderAnalytics {
  totalSpendPaise: number;
  suppliers: Array<{
    supplierId: string;
    supplierLegalName: string;
    orderCount: number;
    spendPaise: number;
  }>;
}

export async function previewReorderDrafts(): Promise<ReorderDraftResult> {
  const { data } = await apiClient.get<ReorderDraftResult>(API.PURCHASE_ORDERS_REORDER_PREVIEW);
  return data;
}

export async function createFromReorder(
  idempotencyKey: string,
  fingerprint: string,
): Promise<ReorderDraftResult> {
  const { data } = await apiClient.post<ReorderDraftResult>(API.PURCHASE_ORDERS_FROM_REORDER, {
    idempotencyKey,
    fingerprint,
  });
  return data;
}

export async function bulkPurchaseOrders(
  action: 'ISSUE' | 'CANCEL',
  items: Array<{ id: string; expectedVersion: number }>,
): Promise<PurchaseOrder[]> {
  const { data } = await apiClient.post<{ items: PurchaseOrder[] }>(API.PURCHASE_ORDERS_BULK, {
    action,
    items,
  });
  return data.items;
}

export async function getPurchaseOrderAnalytics(): Promise<PurchaseOrderAnalytics> {
  const { data } = await apiClient.get<PurchaseOrderAnalytics>(API.PURCHASE_ORDERS_ANALYTICS);
  return data;
}

export type GoodsReceiptStatus = 'PENDING_QC';

export interface GoodsReceiptLine {
  purchaseOrderLineId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number | string;
  unitRatePaise: number;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  receiptReference: string;
  status: GoodsReceiptStatus;
  createdAt: string;
  lines: GoodsReceiptLine[];
}

export interface GoodsReceiptOutstandingLine {
  purchaseOrderLineId: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number | string;
  unitRatePaise: number;
  receivedQuantity: number | string;
  remainingQuantity: number | string;
}

export interface GoodsReceipts {
  purchaseOrderId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplierLegalName: string;
  lines: GoodsReceiptOutstandingLine[];
  receipts: GoodsReceipt[];
}

export interface CreateGoodsReceiptInput {
  receiptReference: string;
  idempotencyKey: string;
  lines: Array<{
    purchaseOrderLineId: string;
    quantity: number;
    unitRatePaise: number;
  }>;
}

export async function listGoodsReceipts(purchaseOrderId: string): Promise<GoodsReceipts> {
  const { data } = await apiClient.get<GoodsReceipts>(API.purchaseOrderReceipts(purchaseOrderId));
  return data;
}

export async function createGoodsReceipt(
  purchaseOrderId: string,
  input: CreateGoodsReceiptInput,
): Promise<GoodsReceipt> {
  const { data } = await apiClient.post<GoodsReceipt>(
    API.purchaseOrderReceipts(purchaseOrderId),
    input,
  );
  return data;
}
