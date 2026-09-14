import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { formatPaise } from '../TrendsScreen.utils';

export const selectTrendsSlice = (state: RootState) => state.trends;

export const selectTrendsStatus = (state: RootState) => state.trends.status;
export const selectTrendsStatusHint = (state: RootState) => state.trends.statusHint;
export const selectTrendsPlanGate = (state: RootState) => state.trends.planGate;
export const selectTrendsView = (state: RootState) => state.trends.view;
export const selectTrendsCompare = (state: RootState) => state.trends.compare;
export const selectTrendsScope = (state: RootState) => state.trends.scope;
export const selectTrendsBusy = (state: RootState) => state.trends.busy;

export const selectTrendsDeltaPct = createSelector(selectTrendsView, (view) => {
  if (view == null || view.delta.salesPctBps == null) {
    return null;
  }
  return view.delta.salesPctBps / 100;
});

export const selectTrendsAvgBill = createSelector(selectTrendsView, (view) => {
  if (!view || view.current.billCount === 0) {
    return null;
  }
  return formatPaise(Math.round(view.current.salesPaise / view.current.billCount));
});
