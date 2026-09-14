import type { RootState } from '@/store';
import { emptyAgingReport } from './aging.slice';
import { periodLabel, resolveAsOf } from '../AgingScreen.utils';

export const selectAgingStatus = (state: RootState) => state.aging.status;
export const selectAgingStatusHint = (state: RootState) => state.aging.statusHint;
export const selectAgingPlanGate = (state: RootState) => state.aging.planGate;
export const selectAgingBook = (state: RootState) => state.aging.book;
export const selectAgingPeriodKind = (state: RootState) => state.aging.periodKind;
export const selectAgingMonth = (state: RootState) => state.aging.month;
export const selectAgingCustomAsOf = (state: RootState) => state.aging.customAsOf;
export const selectAgingScope = (state: RootState) => state.aging.scope;

export const selectAgingAsOf = (state: RootState) =>
  resolveAsOf(state.aging.periodKind, state.aging.month, state.aging.customAsOf);

export const selectAgingPeriodLabel = (state: RootState) =>
  periodLabel(state.aging.periodKind, state.aging.month, selectAgingAsOf(state));

export const selectAgingReceivables = (state: RootState) =>
  state.aging.receivables ?? emptyAgingReport(selectAgingAsOf(state));

export const selectAgingPayables = (state: RootState) =>
  state.aging.payables ?? emptyAgingReport(selectAgingAsOf(state));

export const selectAgingActiveReport = (state: RootState) =>
  state.aging.book === 'payables' ? selectAgingPayables(state) : selectAgingReceivables(state);
