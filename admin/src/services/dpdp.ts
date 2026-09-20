import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface HqDpdpCategory {
  code: string;
  purpose: string;
  accessRole: string;
  retentionErasure: string;
  exportRule: string;
  accountableOwner: string;
}

export interface HqDpdpRequest {
  id: string;
  tenantId: string | null;
  principalType: string;
  principalId: string | null;
  requestType: string;
  status: string;
  submittedName: string | null;
  notes: string | null;
  identityMethod: string | null;
  deadlineAt: string | null;
  decision: string | null;
  decisionReason: string | null;
  legalRetention: boolean;
  exportJson: string | null;
  createdAt: string;
}

export async function getHqDpdpMatrix(): Promise<HqDpdpCategory[]> {
  const { data } = await apiClient.get<{ categories: HqDpdpCategory[] }>(API.ADMIN_DPDP_MATRIX);
  return data.categories;
}

export async function listHqDpdpRequests(): Promise<HqDpdpRequest[]> {
  const { data } = await apiClient.get<{ items: HqDpdpRequest[] }>(API.ADMIN_DPDP_REQUESTS);
  return data.items;
}

export async function createHqDpdpRequest(body: {
  principalType: string;
  requestType: string;
  principalId?: string;
}): Promise<HqDpdpRequest> {
  const { data } = await apiClient.post<HqDpdpRequest>(API.ADMIN_DPDP_REQUESTS, body);
  return data;
}

export async function acceptHqDpdpRequest(
  id: string,
  identityMethod: string,
): Promise<HqDpdpRequest> {
  const { data } = await apiClient.post<HqDpdpRequest>(API.adminDpdpAccept(id), { identityMethod });
  return data;
}

export async function decideHqDpdpRequest(
  id: string,
  body: { decision: string; correction?: Record<string, string> },
): Promise<HqDpdpRequest> {
  const { data } = await apiClient.post<HqDpdpRequest>(API.adminDpdpDecide(id), body);
  return data;
}
