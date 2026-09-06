import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface AdminSubscription {
  tenantId: string;
  tenantName: string;
  planCode: string;
  status: string;
  expiresAt: string | null;
  branchLimitOverride: number | null;
  effectiveBranchLimit: number;
  maxUsers: number | null;
  usersUsed: number;
  branchesUsed: number;
}

export interface OverrideEvent {
  id: string;
  tenantId: string;
  actorUserId: string;
  beforePlan: string;
  afterPlan: string;
  beforeStatus: string;
  afterStatus: string;
  beforeExpiresAt: string | null;
  afterExpiresAt: string | null;
  beforeBranchLimitOverride: number | null;
  afterBranchLimitOverride: number | null;
  reason: string;
  createdAt: string;
}

export interface OverridePayload {
  planCode: string;
  status: string;
  expiresAt: string | null;
  branchLimitOverride: number | null;
  reason: string;
}

export interface AdminCashfreePayment {
  id: string;
  tenantId: string;
  tenantName: string;
  planCode: string;
  amountPaise: number;
  status: string;
  errorCode: string | null;
  exception: boolean;
  createdAt: string;
}

export async function listSubscriptions(): Promise<AdminSubscription[]> {
  const { data } = await apiClient.get<{ items: AdminSubscription[] }>(API.ADMIN_SUBSCRIPTIONS);
  return data.items;
}

export async function overrideSubscription(
  tenantId: string,
  payload: OverridePayload,
): Promise<AdminSubscription> {
  const { data } = await apiClient.post<AdminSubscription>(
    `${API.ADMIN_SUBSCRIPTIONS}/${tenantId}/override`,
    payload,
  );
  return data;
}

export async function listOverrideHistory(tenantId: string): Promise<OverrideEvent[]> {
  const { data } = await apiClient.get<{ items: OverrideEvent[] }>(
    `${API.ADMIN_SUBSCRIPTIONS}/${tenantId}/overrides`,
  );
  return data.items;
}

export async function listCashfreePayments(): Promise<AdminCashfreePayment[]> {
  const { data } = await apiClient.get<{ items: AdminCashfreePayment[] }>(
    API.ADMIN_SUBSCRIPTION_PAYMENTS,
  );
  return data.items;
}
