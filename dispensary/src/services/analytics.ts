import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type AnalyticsQuery = {
  compare?: 'WOW' | 'MOM';
  scope?: string;
  branchId?: string;
};

export type AnalyticsPeriod = {
  salesPaise: number;
  billCount: number;
  unitsSold: number;
};

export type AnalyticsView = {
  compare: string;
  from: string;
  to: string;
  priorFrom: string;
  priorTo: string;
  scope: string;
  branchId: string | null;
  branchName: string | null;
  current: AnalyticsPeriod;
  prior: AnalyticsPeriod;
  delta: { salesPaise: number; salesPctBps: number | null };
  salesTrend: { points: { date: string; currentPaise: number; priorPaise: number }[] };
  topSellers: { productId: string; name: string; sku: string; units: number; salesPaise: number }[];
  slowDeadStock: {
    productId: string;
    name: string;
    sku: string;
    classification: string;
    onHand: string;
    unitsSold: number;
  }[];
  customerFrequency: { bucket: string; currentCount: number; priorCount: number }[];
};

export async function getAnalytics(query: AnalyticsQuery = {}): Promise<AnalyticsView> {
  const { data } = await apiClient.get<AnalyticsView>(API.ANALYTICS, { params: query });
  return data;
}
