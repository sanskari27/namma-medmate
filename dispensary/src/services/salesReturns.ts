import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type SalesReturnDecision = 'APPROVED';
export type SalesReturnRefundMode = 'CASH' | 'CREDIT_NOTE';

export interface SalesReturnLine {
  id: string | null;
  salesInvoiceLineId: string;
  productId: string;
  productName: string;
  sku: string;
  batchId: string | null;
  batchNumber: string | null;
  quantity: number | string;
  lineTotalPaise: number;
  refundAmountPaise: number;
  stockMovementId: string | null;
}

export interface SalesReturn {
  id: string | null;
  salesInvoiceId: string;
  invoiceNumber: string;
  customerId: string | null;
  reason: string;
  decision: SalesReturnDecision;
  refundMode: SalesReturnRefundMode;
  refundTotalPaise: number;
  cashRefundPaise: number;
  creditNotePaise: number;
  createdAt: string | null;
  lines: SalesReturnLine[];
}

export interface SalesReturnSummary {
  id: string;
  salesInvoiceId: string;
  invoiceNumber: string;
  customerId: string | null;
  reason: string;
  decision: SalesReturnDecision;
  refundMode: SalesReturnRefundMode;
  refundTotalPaise: number;
  createdAt: string;
}

export interface SalesReturnInput {
  salesInvoiceId: string;
  reason: string;
  decision: SalesReturnDecision;
  refundMode: SalesReturnRefundMode;
  idempotencyKey?: string;
  lines: { salesInvoiceLineId: string; quantity: number }[];
}

export async function listSalesReturns(): Promise<{ items: SalesReturnSummary[] }> {
  const { data } = await apiClient.get<{ items: SalesReturnSummary[] }>(API.SALES_RETURNS);
  return data;
}

export async function getSalesReturn(id: string): Promise<SalesReturn> {
  const { data } = await apiClient.get<SalesReturn>(API.salesReturn(id));
  return data;
}

export async function previewSalesReturn(input: SalesReturnInput): Promise<SalesReturn> {
  const { data } = await apiClient.post<SalesReturn>(API.SALES_RETURNS_PREVIEW, input);
  return data;
}

export async function createSalesReturn(input: SalesReturnInput): Promise<SalesReturn> {
  const { data } = await apiClient.post<SalesReturn>(API.SALES_RETURNS, input);
  return data;
}
