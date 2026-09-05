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
