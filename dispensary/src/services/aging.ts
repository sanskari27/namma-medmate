import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type AgingBucketKey = 'D0_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';

export interface AgingBucket {
  key: AgingBucketKey;
  label: string;
  totalPaise: number;
}

export interface AgingParty {
  partyId: string;
  name: string;
  amountPaise: number;
  days: number;
  ageOn: string;
  branchId: string | null;
}

export interface AgingReport {
  asOf: string;
  scope: 'branch' | 'tenant';
  branchId: string | null;
  totalPaise: number;
  sourceBalancePaise: number;
  buckets: AgingBucket[];
  items: AgingParty[];
}

export interface AgingQuery {
  asOf?: string;
  scope?: 'tenant';
  branchId?: string;
}

export async function getReceivables(query: AgingQuery = {}): Promise<AgingReport> {
  const { data } = await apiClient.get<AgingReport>(API.FINANCE_RECEIVABLES, { params: query });
  return data;
}

export async function getPayables(query: AgingQuery = {}): Promise<AgingReport> {
  const { data } = await apiClient.get<AgingReport>(API.FINANCE_PAYABLES, { params: query });
  return data;
}
