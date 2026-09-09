import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { PaymentMode, SalesInvoiceStatus } from '@/services/salesInvoices';

export { ApiError, isApiError };

export type SalesOrderChannel = 'COUNTER' | 'ONLINE';

export interface SalesOrderPayment {
  mode: PaymentMode;
  amountPaise: number;
  reference: string | null;
}

export interface SalesOrderLine {
  id: string;
  productName: string;
  batchNumber: string | null;
  quantity: number | string;
  sellingPricePaise: number;
  lineTotalPaise: number;
}

export interface SalesOrderRow {
  id: string;
  invoiceNumber: string;
  status: SalesInvoiceStatus;
  channel: SalesOrderChannel;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  hasPrescription: boolean;
  prescriptionReference: string | null;
  prescriptionVerified: boolean;
  hasPrescriptionAttachment: boolean;
  prescriptionAttachmentFilename: string | null;
  prescriptionAttachmentContentType: string | null;
  itemUnitCount: number;
  lineCount: number;
  itemSummary: string;
  paymentLabel: string | null;
  amountPaidPaise: number;
  amountDuePaise: number;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  payments: SalesOrderPayment[];
  lines: SalesOrderLine[];
}

export async function listSalesOrders(): Promise<{ items: SalesOrderRow[] }> {
  const { data } = await apiClient.get<{ items: SalesOrderRow[] }>(API.SALES_ORDERS);
  return data;
}
