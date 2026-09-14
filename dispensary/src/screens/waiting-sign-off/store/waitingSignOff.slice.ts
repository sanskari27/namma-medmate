import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApprovalRequest } from '@/services/approvals';
import { decideSignOff, loadWaiting } from './waitingSignOff.thunks';

export type WaitingStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

export type WaitingSignOffState = {
  status: WaitingStatus;
  banner: string | null;
  rowError: string | null;
  requests: ApprovalRequest[];
};

const waitingSignOffSlice = createSlice({
  name: 'waitingSignOff',
  initialState: {
    status: 'loading' as WaitingStatus,
    banner: null as string | null,
    rowError: null as string | null,
    requests: [] as ApprovalRequest[],
  },
  reducers: {
    rowErrorSet(state, action: PayloadAction<string | null>) {
      state.rowError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWaiting.fulfilled, (state, action) => {
        state.requests = action.payload;
        state.status = action.payload.length === 0 ? 'empty' : null;
      })
      .addCase(loadWaiting.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(decideSignOff.fulfilled, (state) => {
        state.banner = 'Sign-off recorded.';
        state.status = 'success';
        state.rowError = null;
      })
      .addCase(decideSignOff.rejected, (state, action) => {
        state.rowError = action.payload ?? 'Could not record that sign-off. Try again.';
      });
  },
});

export const { rowErrorSet } = waitingSignOffSlice.actions;
export const waitingSignOffReducer = waitingSignOffSlice.reducer;
