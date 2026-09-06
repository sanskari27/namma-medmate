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

export interface CashfreePayment {
  id: string;
  tenantId: string;
  planCode: string;
  amountPaise: number;
  status: string;
  checkoutUrl: string | null;
  providerOrderId: string;
  errorCode: string | null;
  createdAt: string;
}

export async function startCashfreeCheckout(
  planCode: string,
  idempotencyKey: string,
): Promise<CashfreePayment> {
  const { data } = await apiClient.post<CashfreePayment>(API.SUBSCRIPTIONS_CASHFREE, {
    planCode,
    idempotencyKey,
  });
  return data;
}

export async function getCashfreePayment(orderId: string): Promise<CashfreePayment> {
  const { data } = await apiClient.get<CashfreePayment>(API.SUBSCRIPTIONS_CASHFREE, {
    params: { orderId },
  });
  return data;
}
