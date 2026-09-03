import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface PlanOffer {
  planCode: string;
  pricePaiseMonthly: number;
  maxUsers: number | null;
  maxBranches: number;
  entitledModules: string[];
}

export interface CurrentSubscription {
  tenantId: string;
  planCode: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  branchLimitOverride: number | null;
  effectiveBranchLimit: number;
  maxUsers: number | null;
  usersUsed: number;
  branchesUsed: number;
  entitledModules: string[];
}

export async function getCatalogue(): Promise<PlanOffer[]> {
  const { data } = await apiClient.get<{ plans: PlanOffer[] }>(API.SUBSCRIPTIONS_CATALOGUE);
  return data.plans;
}

export async function getCurrentSubscription(): Promise<CurrentSubscription> {
  const { data } = await apiClient.get<CurrentSubscription>(API.SUBSCRIPTIONS_CURRENT);
  return data;
}

export async function upgradePlan(
  planCode: string,
  idempotencyKey: string,
): Promise<CurrentSubscription> {
  const { data } = await apiClient.post<CurrentSubscription>(API.SUBSCRIPTIONS_UPGRADE, {
    planCode,
    idempotencyKey,
  });
  return data;
}
