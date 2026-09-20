import type { RootState } from '@/store';

export const selectPrivacyStatus = (state: RootState) => state.privacyDesk.status;
export const selectPrivacyItems = (state: RootState) => state.privacyDesk.items;
export const selectPrivacyMatrix = (state: RootState) => state.privacyDesk.matrix;
export const selectPrivacySelectedId = (state: RootState) => state.privacyDesk.selectedId;
