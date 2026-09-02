import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { AuthUser } from '@/store';

export interface LoginIdentity {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
  mustChangePassword?: boolean;
}

export { ApiError, isApiError };

function toAuthUser(data: LoginIdentity): AuthUser {
  return {
    userId: data.userId,
    displayName: data.displayName,
    role: data.role,
    tenantId: data.tenantId,
    pinSet: Boolean(data.pinSet),
    mustChangePassword: Boolean(data.mustChangePassword),
  };
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.LOGIN, { email, password });
  return toAuthUser(data);
}

export interface SavedLoginPerson {
  userId: string;
  displayName: string;
  role: string;
  email: string;
}

export async function listSavedLogins(): Promise<SavedLoginPerson[]> {
  const { data } = await apiClient.get<{ items: SavedLoginPerson[] }>(API.SAVED_LOGINS);
  return data.items;
}

export async function pinLogin(userId: string, pin: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PIN_LOGIN, { userId, pin });
  return toAuthUser(data);
}

export async function forgetSavedLogin(userId: string): Promise<void> {
  await apiClient.delete(`${API.SAVED_LOGINS}/${userId}`);
}

export async function logoutSession(): Promise<void> {
  await apiClient.post(API.LOGOUT);
}

export async function setPin(pin: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PIN, { pin });
  return toAuthUser(data);
}

export async function unlockPin(pin: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PIN_UNLOCK, { pin });
  return toAuthUser(data);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PASSWORD, {
    currentPassword,
    newPassword,
  });
  return toAuthUser(data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post(API.PASSWORD_RESET_REQUEST, { email });
}

export async function completePasswordReset(token: string, password: string): Promise<void> {
  await apiClient.post(API.PASSWORD_RESET, { token, password });
}

export async function adminResetPassword(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.PASSWORD_ADMIN_RESET, {
    email,
    password,
  });
  return toAuthUser(data);
}
