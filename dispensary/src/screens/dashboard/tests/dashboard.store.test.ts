import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/axios';
import { authReducer, notificationsReducer } from '@/store';
import {
  chartTypeChanged,
  dashboardReducer,
  metricChanged,
  periodChanged,
} from '../store/dashboard.slice';
import { loadDashboard, reloadDashboardPeriod } from '../store/dashboard.thunks';
import type { HomeDashboardView } from '@/services/homeDashboard';

vi.mock('@/services/homeDashboard', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchHomeDashboard: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { fetchHomeDashboard } from '@/services/homeDashboard';

const fetchMock = vi.mocked(fetchHomeDashboard);

const sample: HomeDashboardView = {
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  hero: {
    monthSalesPaise: 0,
    avgBillTodayPaise: 0,
    itemsSoldToday: 0,
    duesToCollectPaise: 0,
    duesCustomerCount: 0,
  },
  quickActions: {
    pendingPrescriptions: 0,
    lowStockCount: 0,
    pendingApprovals: 0,
    pendingGrn: 0,
  },
  kpis: {
    todaySalesPaise: 0,
    todayBillCount: 0,
    todayOnlineSalesPaise: 0,
    todayCounterSalesPaise: 0,
    yesterdaySalesPaise: 0,
    pendingPrescriptions: 0,
    stockAlertCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    heldBillCount: 0,
    newHeldBillCount: 0,
  },
  analytics: {
    period: '7D',
    totalSalesPaise: 0,
    totalBillCount: 0,
    channelSplit: [],
    paymentModes: [],
    topCategories: [],
    trend: [],
  },
  attention: [],
  expiringSoon: [],
  topSellers: [],
  recentTransactions: [],
};

function store() {
  return configureStore({
    reducer: {
      auth: authReducer,
      notifications: notificationsReducer,
      dashboard: dashboardReducer,
    },
  });
}

describe('dashboard store', () => {
  it('updates local chart controls', () => {
    const s = store();
    s.dispatch(periodChanged('30D'));
    s.dispatch(metricChanged('orders'));
    s.dispatch(chartTypeChanged('bars'));
    expect(s.getState().dashboard.period).toBe('30D');
    expect(s.getState().dashboard.metric).toBe('orders');
    expect(s.getState().dashboard.chartType).toBe('bars');
  });

  it('loadDashboard stores the home view', async () => {
    fetchMock.mockResolvedValue(sample);
    const s = store();
    await s.dispatch(loadDashboard());
    expect(s.getState().dashboard.status).toBe('success');
    expect(s.getState().dashboard.view).toEqual(sample);
  });

  it('reloadDashboardPeriod maps api failures', async () => {
    fetchMock.mockRejectedValue(new ApiError('nope', 403, 'FORBIDDEN'));
    const s = store();
    await s.dispatch(reloadDashboardPeriod('12M'));
    expect(s.getState().dashboard.status).toBe('denied');
    expect(s.getState().dashboard.refreshing).toBe(false);
  });

  it('reloadDashboardPeriod maps network failures', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const s = store();
    await s.dispatch(reloadDashboardPeriod('7D'));
    expect(s.getState().dashboard.status).toBe('failure');
  });

  it('maps empty api messages to a null hint', async () => {
    fetchMock.mockRejectedValue(new ApiError('', 500, 'SERVER_ERROR'));
    const s = store();
    await s.dispatch(loadDashboard());
    expect(s.getState().dashboard.status).toBe('failure');
    expect(s.getState().dashboard.statusHint).toBeNull();
  });

  it('rejected actions without payload fall back to failure', () => {
    const state = dashboardReducer(undefined, {
      type: loadDashboard.rejected.type,
      payload: undefined,
    });
    expect(state.status).toBe('failure');
    const periodState = dashboardReducer(undefined, {
      type: reloadDashboardPeriod.rejected.type,
      payload: undefined,
    });
    expect(periodState.status).toBe('failure');
  });
});
