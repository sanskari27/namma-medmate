import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { OwnerDesk } from '@/services/dashboards';

export { ApiError, isApiError };

export type DashboardPeriod = '7D' | '30D' | '12M';

export type HomeDashboardView = {
  asOf: string;
  generatedAt: string;
  scope: 'branch' | 'tenant' | string;
  branchId: string | null;
  branchName: string;
  hero: {
    monthSalesPaise: number;
    avgBillTodayPaise: number;
    itemsSoldToday: number;
    duesToCollectPaise: number;
    duesCustomerCount: number;
    duesStatus?: string | null;
  };
  quickActions: {
    pendingPrescriptions: number;
    lowStockCount: number;
    pendingApprovals: number;
    pendingGrn: number;
  };
  kpis: {
    todaySalesPaise: number;
    todayBillCount: number;
    todayOnlineSalesPaise: number;
    todayCounterSalesPaise: number;
    yesterdaySalesPaise: number;
    pendingPrescriptions: number;
    stockAlertCount: number;
    lowStockCount: number;
    expiringCount: number;
    heldBillCount: number;
    newHeldBillCount: number;
  };
  analytics: {
    period: DashboardPeriod;
    totalSalesPaise: number;
    totalBillCount: number;
    channelSplit: { key: string; label: string; salesPaise: number; billCount: number }[];
    paymentModes: { mode: string; label: string; salesPaise: number }[];
    topCategories: { categoryId: string; name: string; icon: string | null; salesPaise: number }[];
    trend: { date: string; salesPaise: number; billCount: number }[];
    status?: string | null;
  };
  attention: {
    id: string;
    kind: string;
    title: string;
    detail: string;
    href: string;
    actionLabel: string;
  }[];
  expiringSoon: {
    productId: string;
    sku: string;
    productName: string;
    batchNumber: string;
    expiresOn: string;
    quantity: number | string;
    branchId?: string | null;
    branchName?: string | null;
    categoryIcon?: string | null;
  }[];
  topSellers: {
    productId: string;
    sku: string;
    productName: string;
    quantity: number | string;
    salesPaise: number;
    categoryIcon?: string | null;
  }[];
  recentTransactions: {
    id: string;
    invoiceNumber: string;
    totalPaise: number;
    completedAt: string;
    customerLabel: string;
  }[];
  owner?: OwnerDesk | null;
};

export async function fetchHomeDashboard(period: DashboardPeriod = '7D'): Promise<HomeDashboardView> {
  const { data } = await apiClient.get<HomeDashboardView>(API.DASHBOARD_HOME, { params: { period } });
  return data;
}
