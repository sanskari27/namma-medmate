import type { RootState } from '@/store';

export const selectStaffStatus = (state: RootState) => state.staffAccounts.status;
export const selectStaffBanner = (state: RootState) => state.staffAccounts.banner;
export const selectStaffItems = (state: RootState) => state.staffAccounts.items;
export const selectStaffSearch = (state: RootState) => state.staffAccounts.search;
export const selectStaffAddOpen = (state: RootState) => state.staffAccounts.addOpen;

export const selectStaffVisible = (state: RootState) => {
  const q = state.staffAccounts.search.trim().toLowerCase();
  if (!q) {
    return state.staffAccounts.items;
  }
  return state.staffAccounts.items.filter((row) =>
    `${row.displayName} ${row.email} ${row.phone ?? ''}`.toLowerCase().includes(q),
  );
};
