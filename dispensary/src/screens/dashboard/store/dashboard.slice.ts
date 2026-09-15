import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DashboardView } from '@/services/dashboards';
import type { DashboardPeriod, HomeDashboardView } from '@/services/homeDashboard';
import type { DashboardDesk, PageStatus } from '../DashboardScreen.utils';
import { deskStatusForView, loadDashboard, reloadDashboardPeriod } from './dashboard.thunks';

export type DashboardChartType = 'donut' | 'bars' | 'line';
export type DashboardMetric = 'revenue' | 'orders';

export type DashboardState = {
  status: PageStatus;
  statusHint: string | null;
  view: HomeDashboardView | null;
  deskView: DashboardView | null;
  desk: DashboardDesk | null;
  period: DashboardPeriod;
  metric: DashboardMetric;
  chartType: DashboardChartType;
  refreshing: boolean;
};

const initialState: DashboardState = {
  status: 'loading',
  statusHint: null,
  view: null,
  deskView: null,
  desk: null,
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
      .addCase(loadDashboard.pending, (state, action) => {
        state.status = 'loading';
        state.statusHint = null;
        if (action.meta.arg !== undefined) {
          state.desk = action.meta.arg;
        }
        if (action.meta.arg && action.meta.arg !== 'owner') {
          state.view = null;
        }
        if (action.meta.arg === 'owner') {
          state.deskView = null;
        }
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.desk = action.payload.desk;
        state.refreshing = false;
        state.statusHint = null;
        if (action.payload.kind === 'home') {
          state.view = action.payload.home;
          state.deskView = null;
          state.status = 'success';
          return;
        }
        state.view = null;
        state.deskView = action.payload.deskView;
        state.status = deskStatusForView(action.payload.desk, action.payload.deskView);
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
        state.deskView = null;
        state.desk = 'owner';
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
