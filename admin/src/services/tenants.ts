import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  allowedTransitions: string[];
}

export async function listTenants(): Promise<AdminTenant[]> {
  const { data } = await apiClient.get<{ items: AdminTenant[] }>(API.ADMIN_TENANTS);
  return data.items;
}

export async function updateTenantStatus(
  id: string,
  status: string,
  expectedStatus: string,
  reason: string,
): Promise<AdminTenant> {
  const { data } = await apiClient.post<AdminTenant>(`${API.ADMIN_TENANTS}/${id}/status`, {
    status,
    expectedStatus,
    reason,
  });
  return data;
}

export interface AdminBranch {
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
  branchType: string;
  status: string;
  openingDate: string;
  defaultBranch: boolean;
  linkedWarehouse: boolean;
}

export async function listTenantBranches(tenantId: string): Promise<AdminBranch[]> {
  const { data } = await apiClient.get<{ items: AdminBranch[] }>(
    `${API.ADMIN_TENANTS}/${tenantId}/branches`,
  );
  return data.items;
}
