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
  walkInAggregate?: boolean;
  orderCount?: number;
  storeOrders?: number;
  onlineOrders?: number;
  unitsSold?: number;
  lastVisitAt?: string | null;
  loyaltyPoints?: number;
  lifetimeValuePaise?: number;
  creditDuePaise?: number;
  chronicRx?: boolean;
}

export interface CustomerDirectoryItem {
  id: string | null;
  walkInAggregate: boolean;
  name: string;
  phone: string | null;
  email: string | null;
  chronicConditions: string | null;
  orderCount: number;
  storeOrders: number;
  onlineOrders: number;
  unitsSold: number;
  lastVisitAt: string | null;
  loyaltyPoints: number;
  lifetimeValuePaise: number;
  creditDuePaise: number;
  chronicRx: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerDirectoryPurchase {
  invoiceId: string;
  invoiceNumber: string;
  amountPaise: number;
  itemSummary: string | null;
  paymentLabel: string;
  occurredAt: string;
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
  const items = await listCustomerDirectory(q);
  return items
    .filter((row) => !row.walkInAggregate && row.id)
    .map((row) => ({
      id: row.id!,
      tenantId: '',
      name: row.name,
      phone: row.phone ?? '',
      email: row.email,
      dateOfBirth: null,
      gender: null,
      address: null,
      bloodGroup: null,
      allergies: null,
      chronicConditions: row.chronicConditions,
      createdAt: row.createdAt ?? '',
      updatedAt: row.updatedAt ?? '',
      walkInAggregate: false,
      orderCount: row.orderCount,
      storeOrders: row.storeOrders,
      onlineOrders: row.onlineOrders,
      unitsSold: row.unitsSold,
      lastVisitAt: row.lastVisitAt,
      loyaltyPoints: row.loyaltyPoints,
      lifetimeValuePaise: row.lifetimeValuePaise,
      creditDuePaise: row.creditDuePaise,
      chronicRx: row.chronicRx,
    }));
}

export async function listCustomerDirectory(q?: string): Promise<CustomerDirectoryItem[]> {
  const { data } = await apiClient.get<{ items: CustomerDirectoryItem[] }>(API.CUSTOMERS, {
    params: q ? { q } : undefined,
  });
  return data.items.map((row) => ({
    id: row.id ?? null,
    walkInAggregate: Boolean(row.walkInAggregate),
    name: row.name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    chronicConditions: row.chronicConditions ?? null,
    orderCount: row.orderCount ?? 0,
    storeOrders: row.storeOrders ?? 0,
    onlineOrders: row.onlineOrders ?? 0,
    unitsSold: row.unitsSold ?? 0,
    lastVisitAt: row.lastVisitAt ?? null,
    loyaltyPoints: row.loyaltyPoints ?? 0,
    lifetimeValuePaise: row.lifetimeValuePaise ?? 0,
    creditDuePaise: row.creditDuePaise ?? 0,
    chronicRx: Boolean(row.chronicRx),
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  }));
}

export async function listCustomerDirectoryPurchases(input: {
  customerId?: string | null;
  walkIn?: boolean;
}): Promise<CustomerDirectoryPurchase[]> {
  if (input.walkIn) {
    const { data } = await apiClient.get<{ items: CustomerDirectoryPurchase[] }>(
      API.CUSTOMERS_WALK_IN_PURCHASES,
    );
    return data.items;
  }
  const { data } = await apiClient.get<{ items: CustomerDirectoryPurchase[] }>(
    API.customerPurchases(input.customerId!),
  );
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
