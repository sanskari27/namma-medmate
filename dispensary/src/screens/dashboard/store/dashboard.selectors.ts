import type { RootState } from '@/store';

export const selectDashboardStatus = (state: RootState) => state.dashboard.status;
export const selectDashboardHint = (state: RootState) => state.dashboard.statusHint;
export const selectDashboardView = (state: RootState) => state.dashboard.view;
export const selectDashboardDeskView = (state: RootState) => state.dashboard.deskView;
export const selectDashboardDesk = (state: RootState) => state.dashboard.desk;
export const selectDashboardPeriod = (state: RootState) => state.dashboard.period;
export const selectDashboardMetric = (state: RootState) => state.dashboard.metric;
export const selectDashboardChartType = (state: RootState) => state.dashboard.chartType;
export const selectDashboardBusy = (state: RootState) =>
  state.dashboard.status === 'loading' || state.dashboard.refreshing;
