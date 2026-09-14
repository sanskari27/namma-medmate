import type { RootState } from '@/store';

export const selectOutletsStatus = (state: RootState) => state.branches.status;
export const selectOutletsItems = (state: RootState) => state.branches.items;
export const selectOutletsForm = (state: RootState) => state.branches.form;
export const selectOutletsSelectedId = (state: RootState) => state.branches.selectedId;
export const selectOutletsCreating = (state: RootState) => state.branches.creating;
export const selectOutletsEditing = (state: RootState) =>
  state.branches.creating || state.branches.selectedId !== null;
