import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface DpdpCategory {
  code: string;
  purpose: string;
  accessRole: string;
  retentionErasure: string;
  exportRule: string;
  accountableOwner: string;
}

export interface DpdpRequest {
  id: string;
  tenantId: string | null;
  principalType: string;
  principalId: string | null;
  requestType: string;
  status: string;
  submittedName: string | null;
  submittedPhone: string | null;
  notes: string | null;
  identityMethod: string | null;
  identityAttestedBy: string | null;
  identityAttestedAt: string | null;
  acceptedAt: string | null;
  deadlineAt: string | null;
  decision: string | null;
  decisionReason: string | null;
  legalRetention: boolean;
  exportJson: string | null;
  createdBy: string;
  version: number;
  createdAt: string;
}

export async function getDpdpMatrix(): Promise<DpdpCategory[]> {
  const { data } = await apiClient.get<{ categories: DpdpCategory[] }>(API.DPDP_MATRIX);
  return data.categories;
}

export async function listDpdpRequests(): Promise<DpdpRequest[]> {
  const { data } = await apiClient.get<{ items: DpdpRequest[] }>(API.DPDP_REQUESTS);
  return data.items;
}

export async function createDpdpRequest(body: {
  principalType: string;
  requestType: string;
  principalId?: string;
  submittedName?: string;
  submittedPhone?: string;
  notes?: string;
}): Promise<DpdpRequest> {
  const { data } = await apiClient.post<DpdpRequest>(API.DPDP_REQUESTS, body);
  return data;
}

export async function acceptDpdpRequest(id: string, identityMethod: string): Promise<DpdpRequest> {
  const { data } = await apiClient.post<DpdpRequest>(API.dpdpAccept(id), { identityMethod });
  return data;
}

export async function decideDpdpRequest(
  id: string,
  body: { decision: string; decisionReason?: string; correction?: Record<string, string> },
): Promise<DpdpRequest> {
  const { data } = await apiClient.post<DpdpRequest>(API.dpdpDecide(id), body);
  return data;
}
