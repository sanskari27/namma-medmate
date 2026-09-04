import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
}

export interface CustomerFamily {
  id: string;
  label: string | null;
  members: FamilyMember[];
  createdAt: string;
}

export interface FamilyHistoryItem {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  summary: string;
  occurredAt: string;
}

export interface FamilyCreditMember {
  customerId: string;
  customerName: string;
  customerPhone: string;
  limitPaise: number;
  balancePaise: number;
  availablePaise: number;
  version: number;
}

export interface FamilyCreditLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  amountPaise: number;
  balanceAfterPaise: number;
  invoiceId: string | null;
  settlementMode: string | null;
  settlementReference: string | null;
  occurredAt: string;
}

export interface FamilyCredit {
  familyId: string;
  totalLimitPaise: number;
  totalBalancePaise: number;
  totalAvailablePaise: number;
  members: FamilyCreditMember[];
  entries: FamilyCreditLedgerEntry[];
}

export async function getFamilyForCustomer(customerId: string): Promise<CustomerFamily | null> {
  try {
    const { data } = await apiClient.get<CustomerFamily>(API.CUSTOMER_FAMILIES, {
      params: { customerId },
    });
    return data;
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getCustomerFamily(id: string): Promise<CustomerFamily> {
  const { data } = await apiClient.get<CustomerFamily>(API.customerFamily(id));
  return data;
}

export async function createCustomerFamily(memberIds: string[]): Promise<CustomerFamily> {
  const { data } = await apiClient.post<CustomerFamily>(API.CUSTOMER_FAMILIES, { memberIds });
  return data;
}

export async function addFamilyMember(
  familyId: string,
  customerId: string,
): Promise<CustomerFamily> {
  const { data } = await apiClient.post<CustomerFamily>(API.customerFamilyMembers(familyId), {
    customerId,
  });
  return data;
}

export async function removeFamilyMember(
  familyId: string,
  customerId: string,
): Promise<CustomerFamily> {
  const { data } = await apiClient.delete<CustomerFamily>(
    API.customerFamilyMember(familyId, customerId),
  );
  return data;
}

export async function getFamilyHistory(
  familyId: string,
  params?: { memberId?: string; type?: string },
): Promise<FamilyHistoryItem[]> {
  const { data } = await apiClient.get<{ items: FamilyHistoryItem[] }>(
    API.customerFamilyHistory(familyId),
    { params },
  );
  return data.items;
}

export async function getFamilyCredit(familyId: string): Promise<FamilyCredit> {
  const { data } = await apiClient.get<FamilyCredit>(API.customerFamilyCredit(familyId));
  return data;
}
