import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { AuthUser } from '@/store';

export interface LoginIdentity {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
}

export { ApiError, isApiError };

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.LOGIN, { email, password });
  return {
    userId: data.userId,
    displayName: data.displayName,
    role: data.role,
    tenantId: data.tenantId,
  };
}
