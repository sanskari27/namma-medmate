import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { ProductUnit } from '@/services/products';

export { ApiError, isApiError };

export type SalesInvoiceStatus = 'DRAFT' | 'HELD' | 'COMPLETED';

export type DiscountType = 'NONE' | 'PERCENT' | 'FLAT';
export type TaxJurisdiction = 'INTRA' | 'INTER';
export type DiscountApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type GstRateSource = 'PRODUCT' | 'MANUAL';
export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'BANK_TRANSFER';

export interface SalesInvoicePayment {
  mode: PaymentMode;
  amountPaise: number;
  reference: string | null;
}

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
  discountType: DiscountType | null;
  discountValue: number;
  billDiscountPaise: number;
  hsnCode: string | null;
  taxCategory: string | null;
  gstRate: number | null;
  gstRateSource: GstRateSource | null;
  originalGstRate: number | null;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTaxablePaise: number;
  lineTaxPaise: number;
  lineTotalPaise: number;
  prescribedQuantity?: number | string | null;
  offerId?: string | null;
  offerName?: string | null;
  offerKind?: 'BOGO' | 'SEASONAL' | 'BUNDLE' | null;
  offerPriority?: number | null;
  offerBenefitPaise?: number;
  offerExplanation?: string | null;
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
  billDiscountType: DiscountType | null;
  billDiscountValue: number;
  customerGstin: string | null;
  taxJurisdiction: TaxJurisdiction | null;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number;
  discountApprovalRequestId: string | null;
  discountApprovalStatus: DiscountApprovalStatus | null;
  taxAdjustmentReason: string | null;
  taxAdjusted: boolean;
  amountPaidPaise: number;
  amountDuePaise: number;
  changePaise: number;
  completedAt: string | null;
  payments: SalesInvoicePayment[];
  lines: SalesInvoiceLine[];
  createdAt: string;
  updatedAt: string;
  revalidation?: InvoiceRevalidation | null;
}

export interface InvoiceRevalidation {
  stock: boolean;
  expiry: boolean;
  price: boolean;
  tax: boolean;
  approval: boolean;
}

export interface SalesInvoiceLineInput {
  productId: string;
  batchId: string | null;
  quantity: number;
  unit: ProductUnit;
  mrpPaise: number;
  sellingPricePaise: number;
  discountPaise: number;
  prescribedQuantity?: number;
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

export async function listSalesInvoices(query?: { status?: SalesInvoiceStatus }): Promise<{
  items: SalesInvoice[];
}> {
  const { data } = await apiClient.get<{ items: SalesInvoice[] }>(API.SALES_INVOICES, {
    params: query?.status ? { status: query.status } : undefined,
  });
  return data;
}

export async function getSalesInvoice(id: string): Promise<SalesInvoice> {
  const { data } = await apiClient.get<SalesInvoice>(API.salesInvoice(id));
  return data;
}

export async function holdSalesInvoice(
  id: string,
  input: { expectedVersion: number },
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceHold(id), input);
  return data;
}

export async function resumeSalesInvoice(
  id: string,
  input: { expectedVersion: number },
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceResume(id), input);
  return data;
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

export interface InvoicePricingInput {
  expectedVersion: number;
  customerGstin: string | null;
  billDiscountType: DiscountType;
  billDiscountValue: number;
  lines: { productId: string; type: DiscountType; value: number }[];
}

export interface InvoiceTaxAdjustmentInput {
  expectedVersion: number;
  reason: string;
  lines: { productId: string; gstRate: number }[];
}

export async function applyInvoicePricing(
  id: string,
  input: InvoicePricingInput,
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoicePricing(id), input);
  return data;
}

export async function adjustInvoiceTax(
  id: string,
  input: InvoiceTaxAdjustmentInput,
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceTaxAdjustment(id), input);
  return data;
}

export async function assertInvoicePricingReady(id: string): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceAssertReady(id), {});
  return data;
}

export interface InvoiceCompleteInput {
  expectedVersion: number;
  expectedTotalPaise: number;
  changePaise: number;
  idempotencyKey: string;
  payments: { mode: PaymentMode; amountPaise: number; reference: string | null }[];
}

export async function completeSalesInvoice(
  id: string,
  input: InvoiceCompleteInput,
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceComplete(id), input);
  return data;
}

export interface PrescriptionFulfillmentItem {
  productId: string;
  prescribedQuantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
}

export async function getPrescriptionFulfillment(
  reference: string,
  customerId: string,
): Promise<{ items: PrescriptionFulfillmentItem[] }> {
  const { data } = await apiClient.get<{ items: PrescriptionFulfillmentItem[] }>(
    API.SALES_PRESCRIPTIONS,
    { params: { reference, customerId } },
  );
  return data;
}

export interface InvoiceOfferItem {
  id: string;
  name: string;
  kind: 'BOGO' | 'SEASONAL' | 'BUNDLE';
  priority: number;
  explanation: string;
  benefitPaise: number;
}

export async function listInvoiceOffers(id: string): Promise<{ items: InvoiceOfferItem[] }> {
  const { data } = await apiClient.get<{ items: InvoiceOfferItem[] }>(API.salesInvoiceOffers(id));
  return data;
}

export async function applyInvoiceOffers(
  id: string,
  input: { expectedVersion: number },
): Promise<SalesInvoice> {
  const { data } = await apiClient.post<SalesInvoice>(API.salesInvoiceOffers(id), input);
  return data;
}
