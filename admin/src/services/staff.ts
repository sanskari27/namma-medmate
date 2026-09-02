import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface HqOperator {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: string;
  status: string;
  kind: string | null;
  registrationId: string | null;
  createdBy: string | null;
  mustChangePassword: boolean;
}

export interface StaffVerificationItem {
  id: string;
  userId: string;
  tenantId: string | null;
  email: string;
  displayName: string;
  kind: string;
  licenseNumber: string | null;
  evidenceReference: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export async function listOperators(): Promise<HqOperator[]> {
  const { data } = await apiClient.get<{ items: HqOperator[] }>(API.USERS);
  return data.items;
}

export async function createOperator(input: {
  displayName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<HqOperator> {
  const { data } = await apiClient.post<HqOperator>(API.USERS, {
    ...input,
    role: 'admin_verification',
    kind: 'STAFF',
  });
  return data;
}

export async function deactivateOperator(id: string): Promise<HqOperator> {
  const { data } = await apiClient.post<HqOperator>(`${API.USERS}/${id}/deactivate`);
  return data;
}

export async function listStaffVerifications(): Promise<StaffVerificationItem[]> {
  const { data } = await apiClient.get<{ items: StaffVerificationItem[] }>(API.STAFF_VERIFICATIONS);
  return data.items;
}

export async function approveStaffVerification(
  id: string,
  evidenceReference: string,
): Promise<StaffVerificationItem> {
  const { data } = await apiClient.post<StaffVerificationItem>(
    `${API.STAFF_VERIFICATIONS}/${id}/approve`,
    { evidenceReference },
  );
  return data;
}
