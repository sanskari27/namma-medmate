import type { RootState } from '@/store';

export const selectWaitingStatus = (state: RootState) => state.waitingSignOff.status;
export const selectWaitingBanner = (state: RootState) => state.waitingSignOff.banner;
export const selectWaitingRowError = (state: RootState) => state.waitingSignOff.rowError;
export const selectWaitingRequests = (state: RootState) => state.waitingSignOff.requests;
