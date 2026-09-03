import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface TenantRegistrationResult {
  tenantId: string;
  email: string;
}

export interface TenantVerifyResult {
  tenantId: string;
  email: string;
}

export async function registerPharmacy(input: {
  businessName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<TenantRegistrationResult> {
  const { data } = await apiClient.post<TenantRegistrationResult>(API.TENANTS_REGISTER, input);
  return data;
}

export async function verifyPharmacyEmail(token: string): Promise<TenantVerifyResult> {
  const { data } = await apiClient.post<TenantVerifyResult>(API.TENANTS_VERIFY_EMAIL, { token });
  return data;
}
