import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface StaffAccount {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: string;
  status: string;
  kind: string | null;
  licenseNumber: string | null;
  registrationId: string | null;
  createdBy: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface CreateStaffInput {
  displayName: string;
  phone: string;
  email: string;
  password: string;
  role: 'pharmacy_staff';
  kind: 'STAFF' | 'PHARMACIST';
  licenseNumber?: string;
}

export async function listStaff(): Promise<StaffAccount[]> {
  const { data } = await apiClient.get<{ items: StaffAccount[] }>(API.USERS);
  return data.items;
}

export async function createStaff(input: CreateStaffInput): Promise<StaffAccount> {
  const { data } = await apiClient.post<StaffAccount>(API.USERS, input);
  return data;
}

export async function deactivateStaff(id: string): Promise<StaffAccount> {
  const { data } = await apiClient.post<StaffAccount>(`${API.USERS}/${id}/deactivate`);
  return data;
}
