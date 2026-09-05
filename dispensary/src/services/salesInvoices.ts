import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { ProductUnit } from '@/services/products';

export { ApiError, isApiError };

export type SalesInvoiceStatus = 'DRAFT';

export interface SalesInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchId: string | null;
  batchNumber: string | null;
  expiresOn: string | null;
  quantity: number | string;
  unit: ProductUnit;
  baseQuantity: number | string;
  mrpPaise: number;
  sellingPricePaise: number;
  discountPaise: number;
  hsnCode: string | null;
  gstRate: number | null;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTaxablePaise: number;
  lineTaxPaise: number;
  lineTotalPaise: number;
}

export interface SalesInvoice {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceNumber: string;
  status: SalesInvoiceStatus;
  staffUserId: string;
  terminalId: string;
  customerId: string | null;
  doctorId: string | null;
  prescriptionReference: string | null;
  prescriptionVerified: boolean;
  version: number;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  lines: SalesInvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoiceLineInput {
  productId: string;
  batchId: string | null;
  quantity: number;
  unit: ProductUnit;
  mrpPaise: number;
  sellingPricePaise: number;
  discountPaise: number;
}

export interface CreateSalesInvoiceInput {
  customerId: string | null;
  doctorId: string | null;
  prescriptionReference: string | null;
  prescriptionVerified: boolean;
  idempotencyKey: string;
  lines: SalesInvoiceLineInput[];
}

export interface UpdateSalesInvoiceInput {
  customerId: string | null;
  doctorId: string | null;
  prescriptionReference: string | null;
  prescriptionVerified: boolean;
  expectedVersion: number;
  lines: SalesInvoiceLineInput[];
}

export async function createSalesInvoice(input: CreateSalesInvoiceInput): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.SALES_INVOICES, input);
  return data;
}

export async function updateSalesInvoice(
  id: string,
  input: UpdateSalesInvoiceInput,
): Promise<SalesInvoice> {
  const { data } = await apiClient.patch<SalesInvoice>(API.salesInvoice(id), input);
  return data;
}
