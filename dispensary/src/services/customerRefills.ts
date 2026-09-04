import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface CustomerRefill {
  id: string;
  customerId: string;
  medicineName: string;
  intervalDays: number;
  nextDueOn: string;
  version: number;
  updatedAt: string;
}

export interface DueRefill {
  refillId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  medicineName: string;
  intervalDays: number;
  nextDueOn: string;
  version: number;
}

export interface CustomerTag {
  id: string;
  name: string;
  createdAt: string;
}

export async function listCustomerRefills(customerId: string): Promise<CustomerRefill[]> {
  const { data } = await apiClient.get<{ items: CustomerRefill[] }>(
    API.customerRefills(customerId),
  );
  return data.items;
}

export async function listDueRefills(): Promise<DueRefill[]> {
  const { data } = await apiClient.get<{ items: DueRefill[] }>(API.CUSTOMERS_REFILLS_DUE);
  return data.items;
}

export async function createCustomerRefill(
  customerId: string,
  input: { medicineName: string; intervalDays?: number; nextDueOn?: string },
): Promise<CustomerRefill> {
  const { data } = await apiClient.post<CustomerRefill>(API.customerRefills(customerId), input);
  return data;
}

export async function updateCustomerRefill(
  customerId: string,
  refillId: string,
  input: { intervalDays: number; nextDueOn: string; expectedVersion: number },
): Promise<CustomerRefill> {
  const { data } = await apiClient.put<CustomerRefill>(
    API.customerRefill(customerId, refillId),
    input,
  );
  return data;
}

export async function deleteCustomerRefill(customerId: string, refillId: string): Promise<void> {
  await apiClient.delete(API.customerRefill(customerId, refillId));
}

export async function listTenantTags(): Promise<CustomerTag[]> {
  const { data } = await apiClient.get<{ items: CustomerTag[] }>(API.CUSTOMERS_TAGS);
  return data.items;
}

export async function createTenantTag(name: string): Promise<CustomerTag> {
  const { data } = await apiClient.post<CustomerTag>(API.CUSTOMERS_TAGS, { name });
  return data;
}

export async function deleteTenantTag(tagId: string): Promise<void> {
  await apiClient.delete(API.customerTag(tagId));
}

export async function listCustomerTags(customerId: string): Promise<CustomerTag[]> {
  const { data } = await apiClient.get<{ items: CustomerTag[] }>(API.customerTags(customerId));
  return data.items;
}

export async function replaceCustomerTags(
  customerId: string,
  tagIds: string[],
): Promise<CustomerTag[]> {
  const { data } = await apiClient.put<{ items: CustomerTag[] }>(API.customerTags(customerId), {
    tagIds,
  });
  return data.items;
}

export function formatDueDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
