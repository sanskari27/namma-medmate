import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import { toAuthUser, type LoginIdentity } from '@/services/auth';
import type { AuthUser } from '@/store';

export async function startImpersonation(email: string): Promise<AuthUser> {
  const { data } = await apiClient.post<LoginIdentity>(API.IMPERSONATION, { email });
  return toAuthUser(data);
}

export async function exitImpersonation(): Promise<AuthUser> {
  const { data } = await apiClient.delete<LoginIdentity>(API.IMPERSONATION);
  return toAuthUser(data);
}

export async function fetchSession(): Promise<AuthUser> {
  const { data } = await apiClient.get<LoginIdentity>(API.ME);
  return toAuthUser(data);
}
