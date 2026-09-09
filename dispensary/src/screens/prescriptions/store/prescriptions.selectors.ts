import type { RootState } from '@/store';
import {
  filterCounts,
  filteredRows,
  statusMix,
  summaryStats,
  topDoctors,
} from '../PrescriptionsScreen.utils';

export const selectPrescriptions = (state: RootState) => state.prescriptions;

export const selectRxStatus = (state: RootState) => state.prescriptions.status;
export const selectRxStatusHint = (state: RootState) => state.prescriptions.statusHint;
export const selectRxItems = (state: RootState) => state.prescriptions.items;
export const selectRxFilter = (state: RootState) => state.prescriptions.filter;
export const selectRxQuery = (state: RootState) => state.prescriptions.query;
export const selectRxSelectedId = (state: RootState) => state.prescriptions.selectedId;
export const selectRxActionBusy = (state: RootState) => state.prescriptions.actionBusy;
export const selectRxActionHint = (state: RootState) => state.prescriptions.actionHint;

export const selectRxFilterCounts = (state: RootState) => filterCounts(state.prescriptions.items);

export const selectFilteredPrescriptions = (state: RootState) =>
  filteredRows(state.prescriptions.items, state.prescriptions.filter, state.prescriptions.query);

export const selectRxSummary = (state: RootState) => summaryStats(state.prescriptions.items);

export const selectRxTopDoctors = (state: RootState) => topDoctors(state.prescriptions.items);

export const selectRxStatusMix = (state: RootState) => statusMix(state.prescriptions.items);

export const selectSelectedPrescription = (state: RootState) => {
  const id = state.prescriptions.selectedId;
  if (!id) return null;
  return state.prescriptions.items.find((row) => row.id === id) ?? null;
};
