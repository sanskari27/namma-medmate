import type { RootState } from '@/store';

export const selectLicensesStatus = (state: RootState) => state.licenses.status;
export const selectLicensesHint = (state: RootState) => state.licenses.statusHint;
export const selectLicensesItems = (state: RootState) => state.licenses.items;
export const selectLicensesDue = (state: RootState) => state.licenses.items.filter((row) => row.due);
export const selectLicensesBranches = (state: RootState) => state.licenses.branches;
export const selectLicensesStaff = (state: RootState) => state.licenses.staff;
export const selectLicensesSelectedId = (state: RootState) => state.licenses.selectedId;
export const selectLicensesCreating = (state: RootState) => state.licenses.creating;
export const selectLicensesForm = (state: RootState) => state.licenses.form;
export const selectLicensesBusy = (state: RootState) => state.licenses.busy;
export const selectLicensesSelected = (state: RootState) =>
  state.licenses.items.find((row) => row.id === state.licenses.selectedId) ?? null;
