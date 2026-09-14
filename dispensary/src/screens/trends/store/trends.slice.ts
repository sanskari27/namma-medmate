import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AnalyticsView } from '@/services/analytics';
import type { CompareKind, OutletScope, PageStatus } from '../TrendsScreen.utils';
import { loadTrends } from './trends.thunks';

export type TrendsScreenState = {
  status: PageStatus;
  statusHint: string | null;
  planGate: boolean;
  view: AnalyticsView | null;
  compare: CompareKind;
  scope: OutletScope;
  busy: boolean;
};

export const initialTrendsScreenState: TrendsScreenState = {
  status: 'loading',
  statusHint: null,
  planGate: false,
  view: null,
  compare: 'WOW',
  scope: 'session',
  busy: false,
};

const trendsSlice = createSlice({
  name: 'trends',
  initialState: initialTrendsScreenState,
  reducers: {
    compareChanged(state, action: PayloadAction<CompareKind>) {
      state.compare = action.payload;
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.planGate = false;
      state.view = null;
      state.busy = false;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      if (action.payload.owner && !action.payload.hasBranch) {
        state.scope = 'tenant';
      } else {
        state.scope = 'session';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTrends.pending, (state) => {
        state.busy = true;
        state.status = 'loading';
        state.statusHint = null;
        state.planGate = false;
      })
      .addCase(loadTrends.fulfilled, (state, action) => {
        state.busy = false;
        state.view = action.payload.view;
        state.status = action.payload.status;
        state.statusHint = action.payload.hint;
        state.planGate = false;
      })
      .addCase(loadTrends.rejected, (state, action) => {
        state.busy = false;
        state.view = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.planGate = action.payload?.planGate ?? false;
      });
  },
});

export const { compareChanged, scopeChanged, accessDenied, hydrateOwnerScope } = trendsSlice.actions;
export const trendsReducer = trendsSlice.reducer;
