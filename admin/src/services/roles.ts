import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface AccessRole {
  id: string;
  name: string;
  code: string | null;
  kind: 'PREDEFINED' | 'CUSTOM';
  scope: 'TENANT' | 'PLATFORM';
  version: number;
  modules: string[];
}

export interface ModuleCatalogItem {
  code: string;
  entitled: boolean;
  gated: boolean;
  reason: string | null;
}

export interface RoleCatalog {
  roles: AccessRole[];
  catalog: ModuleCatalogItem[];
}

export interface UserRoles {
  userId: string;
  roles: AccessRole[];
}

export async function listRoles(): Promise<RoleCatalog> {
  const { data } = await apiClient.get<RoleCatalog>(API.ROLES);
  return data;
}

export async function createRole(name: string, modules: string[]): Promise<AccessRole> {
  const { data } = await apiClient.post<AccessRole>(API.ROLES, { name, modules });
  return data;
}

export async function listUserRoles(userId: string): Promise<UserRoles> {
  const { data } = await apiClient.get<UserRoles>(`${API.USERS}/${userId}/roles`);
  return data;
}

export async function replaceUserRoles(userId: string, roleIds: string[]): Promise<UserRoles> {
  const { data } = await apiClient.put<UserRoles>(`${API.USERS}/${userId}/roles`, { roleIds });
  return data;
}
