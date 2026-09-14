import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AgingReport } from '@/services/aging';
import {
  currentMonth,
  todayIst,
  type AgingBook,
  type OutletScope,
  type PageStatus,
  type PeriodKind,
} from '../AgingScreen.utils';
import { loadAging } from './aging.thunks';

export type AgingScreenState = {
  status: PageStatus;
  statusHint: string | null;
  planGate: boolean;
  book: AgingBook;
  periodKind: PeriodKind;
  month: string;
  customAsOf: string;
  scope: OutletScope;
  receivables: AgingReport | null;
  payables: AgingReport | null;
};

const empty = (asOf: string): AgingReport => ({
  asOf,
  scope: 'branch',
  branchId: null,
  totalPaise: 0,
  sourceBalancePaise: 0,
  buckets: [
    { key: 'D0_30', label: '0–30', totalPaise: 0 },
    { key: 'D31_60', label: '31–60', totalPaise: 0 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [],
});

export const initialAgingScreenState: AgingScreenState = {
  status: 'loading',
  statusHint: null,
  planGate: false,
  book: 'receivables',
  periodKind: 'month',
  month: currentMonth(),
  customAsOf: todayIst(),
  scope: 'session',
  receivables: null,
  payables: null,
};

const agingSlice = createSlice({
  name: 'aging',
  initialState: initialAgingScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.planGate = false;
      state.receivables = null;
      state.payables = null;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      state.scope = action.payload.owner && !action.payload.hasBranch ? 'tenant' : 'session';
    },
    bookChanged(state, action: PayloadAction<AgingBook>) {
      state.book = action.payload;
    },
    periodKindChanged(state, action: PayloadAction<PeriodKind>) {
      state.periodKind = action.payload;
    },
    monthChanged(state, action: PayloadAction<string>) {
      state.month = action.payload;
    },
    customAsOfChanged(state, action: PayloadAction<string>) {
      state.customAsOf = action.payload;
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAging.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
        state.planGate = false;
      })
      .addCase(loadAging.fulfilled, (state, action) => {
        state.receivables = action.payload.receivables;
        state.payables = action.payload.payables;
        state.planGate = false;
        const emptyBooks =
          action.payload.receivables.totalPaise === 0 && action.payload.payables.totalPaise === 0;
        state.status = emptyBooks ? 'empty' : null;
        state.statusHint = null;
      })
      .addCase(loadAging.rejected, (state, action) => {
        const payload = action.payload;
        state.status = payload?.status ?? 'failure';
        state.statusHint = payload?.hint ?? null;
        state.planGate = payload?.planGate ?? false;
        if (state.planGate) {
          state.receivables = null;
          state.payables = null;
        }
      });
  },
});

export const agingReducer = agingSlice.reducer;
export const {
  accessDenied,
  hydrateOwnerScope,
  bookChanged,
  periodKindChanged,
  monthChanged,
  customAsOfChanged,
  scopeChanged,
} = agingSlice.actions;
export { empty as emptyAgingReport };
