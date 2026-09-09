import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DashboardPeriod, HomeDashboardView } from '@/services/homeDashboard';
import type { PageStatus } from '../DashboardScreen.utils';
import { loadDashboard, reloadDashboardPeriod } from './dashboard.thunks';

export type DashboardChartType = 'donut' | 'bars' | 'line';
export type DashboardMetric = 'revenue' | 'orders';

export type DashboardState = {
  status: PageStatus;
  statusHint: string | null;
  view: HomeDashboardView | null;
  period: DashboardPeriod;
  metric: DashboardMetric;
  chartType: DashboardChartType;
  refreshing: boolean;
};

const initialState: DashboardState = {
  status: 'loading',
  statusHint: null,
  view: null,
  period: '7D',
  metric: 'revenue',
  chartType: 'donut',
  refreshing: false,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    periodChanged: (state, action: PayloadAction<DashboardPeriod>) => {
      state.period = action.payload;
    },
    metricChanged: (state, action: PayloadAction<DashboardMetric>) => {
      state.metric = action.payload;
    },
    chartTypeChanged: (state, action: PayloadAction<DashboardChartType>) => {
      state.chartType = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.view = action.payload;
        state.status = 'success';
        state.refreshing = false;
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.refreshing = false;
      })
      .addCase(reloadDashboardPeriod.pending, (state) => {
        state.refreshing = true;
        state.statusHint = null;
      })
      .addCase(reloadDashboardPeriod.fulfilled, (state, action) => {
        state.view = action.payload;
        state.period = action.payload.analytics.period;
        state.status = 'success';
        state.refreshing = false;
      })
      .addCase(reloadDashboardPeriod.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.refreshing = false;
      });
  },
});

export const { periodChanged, metricChanged, chartTypeChanged } = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;
