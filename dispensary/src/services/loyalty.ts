import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type LoyaltyLedgerType =
  'EARN' | 'REDEEM' | 'SETTLEMENT_EARN' | 'RETURN_EARN' | 'RETURN_REDEEM' | 'ADJUSTMENT';

export interface LoyaltyLedgerEntry {
  id: string;
  type: LoyaltyLedgerType;
  points: number;
  deltaPoints: number;
  balanceAfterPoints: number;
  invoiceId: string | null;
  salesReturnId: string | null;
  taxablePaise: number;
  reason: string | null;
  occurredAt: string;
}

export interface CustomerLoyalty {
  customerId: string;
  balancePoints: number;
  version: number;
  entries: LoyaltyLedgerEntry[];
}

export async function getCustomerLoyalty(customerId: string): Promise<CustomerLoyalty> {
  const { data } = await apiClient.get<CustomerLoyalty>(API.customerLoyalty(customerId));
  return data;
}

export async function adjustCustomerLoyalty(
  customerId: string,
  input: {
    points: number;
    reason: string;
    idempotencyKey: string;
    expectedVersion: number;
  },
): Promise<CustomerLoyalty> {
  const { data } = await apiClient.post<CustomerLoyalty>(
    API.customerLoyaltyAdjustments(customerId),
    input,
  );
  return data;
}

export function maxRedeemPoints(totalPaise: number): number {
  if (totalPaise <= 0) {
    return 0;
  }
  return Math.floor((totalPaise * 20) / 100 / 100);
}

export function redeemPaise(points: number): number {
  return points * 100;
}

export function collectiblePaise(totalPaise: number, points: number): number {
  return Math.max(0, totalPaise - redeemPaise(Math.max(0, points)));
}

export function parseRedeemPoints(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}
