import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { AuthUser } from '@/store';

export interface LoginIdentity {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
}

export { ApiError, isApiError };

function toAuthUser(data: LoginIdentity): AuthUser {
  return {
    userId: data.userId,
    displayName: data.displayName,
    role: data.role,
    tenantId: data.tenantId,
    pinSet: Boolean(data.pinSet),
  };
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.LOGIN, { email, password });
  return toAuthUser(data);
}

export async function setPin(pin: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PIN, { pin });
  return toAuthUser(data);
}

export async function unlockPin(pin: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PIN_UNLOCK, { pin });
  return toAuthUser(data);
}
