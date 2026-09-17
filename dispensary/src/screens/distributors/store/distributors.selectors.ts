import type { RootState } from '@/store';
import { filterSuppliers, summaryStats } from '../DistributorsScreen.utils';

export const selectDistributors = (state: RootState) => state.distributors;
export const selectDistributorsStatus = (state: RootState) => state.distributors.status;
export const selectDistributorsStatusHint = (state: RootState) => state.distributors.statusHint;
export const selectDistributorsTab = (state: RootState) => state.distributors.tab;
export const selectDistributorsItems = (state: RootState) => state.distributors.items;
export const selectDistributorsQuery = (state: RootState) => state.distributors.query;
export const selectDistributorFormOpen = (state: RootState) => state.distributors.formOpen;
export const selectDistributorFormBusy = (state: RootState) => state.distributors.formBusy;
export const selectDistributorForm = (state: RootState) => state.distributors.form;
export const selectDistributorEditingId = (state: RootState) => state.distributors.editingId;
export const selectDistributorPayOpen = (state: RootState) => state.distributors.payOpen;
export const selectDistributorPayBusy = (state: RootState) => state.distributors.payBusy;
export const selectDistributorPayError = (state: RootState) => state.distributors.payError;
export const selectDistributorLedger = (state: RootState) => state.distributors.ledger;
export const selectDistributorLedgerLoading = (state: RootState) =>
  state.distributors.ledgerLoading;
export const selectDistributorDues = (state: RootState) => state.distributors.dues;
export const selectDistributorDuesPlanLimit = (state: RootState) =>
  state.distributors.duesPlanLimit;

export const selectFilteredDistributors = (state: RootState) =>
  filterSuppliers(state.distributors.items, state.distributors.query);

export const selectDistributorsSummary = (state: RootState) =>
  summaryStats(state.distributors.items);

export const selectEditingDistributor = (state: RootState) => {
  const id = state.distributors.editingId;
  if (!id) return null;
  return state.distributors.items.find((row) => row.id === id) ?? null;
};
