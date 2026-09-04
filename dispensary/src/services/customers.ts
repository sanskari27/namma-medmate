import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
}

export async function listCustomers(q?: string): Promise<Customer[]> {
  const { data } = await apiClient.get<{ items: Customer[] }>(API.CUSTOMERS, {
    params: q ? { q } : undefined,
  });
  return data.items;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await apiClient.get<Customer>(API.customer(id));
  return data;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data } = await apiClient.post<Customer>(API.CUSTOMERS, input);
  return data;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  const { data } = await apiClient.patch<Customer>(API.customer(id), input);
  return data;
}

export type HistoryFactType = 'PURCHASE' | 'PRESCRIPTION';

export interface CustomerHistoryItem {
  id: string;
  customerId: string;
  type: HistoryFactType;
  summary: string;
  prescriptionReference: string | null;
  doctorId: string | null;
  doctorName: string | null;
  invoiceId: string | null;
  amountPaise: number | null;
  occurredAt: string;
}

export async function getCustomerHistory(id: string): Promise<CustomerHistoryItem[]> {
  const { data } = await apiClient.get<{ items: CustomerHistoryItem[] }>(API.customerHistory(id));
  return data.items;
}

export type MergeSide = 'SURVIVOR' | 'DUPLICATE';

export interface CustomerMergeField {
  field: string;
  status: 'SAME' | 'SURVIVOR_ONLY' | 'DUPLICATE_ONLY' | 'CONFLICT';
  survivorValue: string | null;
  duplicateValue: string | null;
}

export interface CustomerMergePreview {
  mode: 'PREVIEW';
  survivor: Customer;
  duplicate: Customer;
  fields: CustomerMergeField[];
  conflicts: string[];
  linkedRecords: { notificationEvents: number };
}

export async function previewCustomerMerge(
  survivorId: string,
  duplicateId: string,
): Promise<CustomerMergePreview> {
  const { data } = await apiClient.post<CustomerMergePreview>(API.CUSTOMERS_MERGE, {
    mode: 'PREVIEW',
    survivorId,
    duplicateId,
    resolutions: {},
  });
  return data;
}

export async function executeCustomerMerge(
  survivorId: string,
  duplicateId: string,
  resolutions: Record<string, MergeSide>,
): Promise<Customer> {
  const { data } = await apiClient.post<Customer>(API.CUSTOMERS_MERGE, {
    mode: 'EXECUTE',
    survivorId,
    duplicateId,
    resolutions,
  });
  return data;
}
