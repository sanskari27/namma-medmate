import { createSlice } from '@reduxjs/toolkit';
import type { AuditEvent } from '@/services/approvals';
import { loadActivity } from './floorActivity.thunks';

export type ActivityStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

const floorActivitySlice = createSlice({
  name: 'floorActivity',
  initialState: {
    status: 'loading' as ActivityStatus,
    events: [] as AuditEvent[],
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadActivity.fulfilled, (state, action) => {
        state.events = action.payload;
        state.status = action.payload.length === 0 ? 'empty' : null;
      })
      .addCase(loadActivity.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      });
  },
});

export const { accessDenied } = floorActivitySlice.actions;
export const floorActivityReducer = floorActivitySlice.reducer;
