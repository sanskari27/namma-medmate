import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  branchCode: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string | null;
  drugLicenseNumber: string;
  gstin: string | null;
  operatingHours: Record<string, unknown>;
  branchType: 'RETAIL' | 'KIOSK';
  status: 'ACTIVE' | 'INACTIVE';
  openingDate: string;
  defaultBranch: boolean;
  linkedWarehouse: boolean;
  pricingSettings: Record<string, unknown>;
  taxSettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  drugLicenseNumber: string;
  gstin?: string;
  operatingHours?: Record<string, unknown>;
  branchType: 'RETAIL' | 'KIOSK';
  status?: 'ACTIVE' | 'INACTIVE';
  openingDate?: string;
  defaultBranch?: boolean;
  linkedWarehouse?: boolean;
  pricingSettings?: Record<string, unknown>;
  taxSettings?: Record<string, unknown>;
}

export async function listBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<{ items: Branch[] }>(API.BRANCHES);
  return data.items;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const { data } = await apiClient.post<Branch>(API.BRANCHES, input);
  return data;
}

export async function updateBranch(id: string, input: Partial<BranchInput>): Promise<Branch> {
  const { data } = await apiClient.patch<Branch>(`${API.BRANCHES}/${id}`, input);
  return data;
}

export async function copyBranchSettings(
  targetId: string,
  sourceBranchId: string,
): Promise<Branch> {
  const { data } = await apiClient.post<Branch>(`${API.BRANCHES}/${targetId}/copy-settings`, {
    sourceBranchId,
  });
  return data;
}
