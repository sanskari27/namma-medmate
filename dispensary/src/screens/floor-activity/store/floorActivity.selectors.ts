import type { RootState } from '@/store';

export const selectActivityStatus = (state: RootState) => state.floorActivity.status;
export const selectActivityEvents = (state: RootState) => state.floorActivity.events;
