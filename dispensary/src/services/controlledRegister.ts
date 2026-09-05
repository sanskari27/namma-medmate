import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type ControlledSaleKind = 'SALE' | 'RETURN';

export type ControlledSaleLine = {
  id: string;
  kind: ControlledSaleKind;
  productId: string;
  productName: string;
  sku: string;
  scheduleClassification: string | null;
  batchId: string | null;
  batchNumber: string;
  quantity: number;
  prescriptionReference: string;
  patientId: string;
  patientName: string;
  pharmacistUserId: string;
  pharmacistName: string;
  pharmacistRegistration: string | null;
  occurredAt: string;
  salesInvoiceId: string;
  salesInvoiceLineId: string;
  salesReturnId: string | null;
  salesReturnLineId: string | null;
  sourceRegisterId: string | null;
};

export type ControlledSaleFilters = {
  schedule?: string;
  productId?: string;
  patientId?: string;
  pharmacistUserId?: string;
  from?: string;
  to?: string;
};

export async function listControlledRegister(
  filters: ControlledSaleFilters = {},
): Promise<ControlledSaleLine[]> {
  const { data } = await apiClient.get<{ items: ControlledSaleLine[] }>(
    API.COMPLIANCE_CONTROLLED_REGISTER,
    { params: filters },
  );
  return data.items;
}

export async function downloadControlledRegisterExport(
  format: 'csv' | 'ndps',
  filters: ControlledSaleFilters = {},
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.COMPLIANCE_CONTROLLED_REGISTER_EXPORT, {
    params: { format, ...filters },
    responseType: 'blob',
  });
  return data;
}
