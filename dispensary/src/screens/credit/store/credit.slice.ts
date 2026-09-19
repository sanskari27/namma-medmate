import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CreditAgingBand,
  CreditDirectorySummary,
  CreditPaymentItem,
  OutstandingCreditAccount,
} from '@/services/credit';
import type {
  CreditAgingFilter,
  CreditPageStatus,
  CreditSort,
  CreditTab,
} from '../CreditScreen.utils';
import { emptySummary } from '../CreditScreen.utils';
import { loadCreditDirectory } from './credit.thunks';

export type CreditState = {
  status: CreditPageStatus;
  statusHint: string | null;
  summary: CreditDirectorySummary;
  aging: CreditAgingBand[];
  items: OutstandingCreditAccount[];
  payments: CreditPaymentItem[];
  tab: CreditTab;
  query: string;
  sort: CreditSort;
  overdueOnly: boolean;
  agingFilter: CreditAgingFilter;
  selectedId: string | null;
  settleOpen: boolean;
};

export const initialCreditState: CreditState = {
  status: 'idle',
  statusHint: null,
  summary: emptySummary(),
  aging: [],
  items: [],
  payments: [],
  tab: 'outstanding',
  query: '',
  sort: 'amount',
  overdueOnly: false,
  agingFilter: null,
  selectedId: null,
  settleOpen: false,
};

const creditSlice = createSlice({
  name: 'credit',
  initialState: initialCreditState,
  reducers: {
    setCreditTab(state, action: PayloadAction<CreditTab>) {
      state.tab = action.payload;
    },
    setCreditQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setCreditSort(state, action: PayloadAction<CreditSort>) {
      state.sort = action.payload;
    },
    toggleOverdueOnly(state) {
      state.overdueOnly = !state.overdueOnly;
    },
    setAgingFilter(state, action: PayloadAction<CreditAgingFilter>) {
      state.agingFilter =
        state.agingFilter === action.payload ? null : action.payload;
    },
    openCreditDetail(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    closeCreditDetail(state) {
      state.selectedId = null;
      state.settleOpen = false;
    },
    openSettleCredit(state) {
      state.settleOpen = true;
    },
    closeSettleCredit(state) {
      state.settleOpen = false;
    },
    markCreditSuccess(state) {
      state.status = 'success';
      state.statusHint = null;
    },
    clearCreditStatus(state) {
      if (state.status === 'success') {
        state.status = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCreditDirectory.pending, (state) => {
        if (state.items.length === 0 && state.status !== 'success') {
          state.status = 'loading';
        }
        if (state.status !== 'success') {
          state.statusHint = null;
        }
      })
      .addCase(loadCreditDirectory.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
        state.aging = action.payload.aging;
        state.items = action.payload.items;
        state.payments = action.payload.payments;
        if (state.status !== 'success') {
          state.status = null;
        }
        if (
          state.selectedId &&
          !action.payload.items.some((row) => row.customerId === state.selectedId)
        ) {
          state.selectedId = null;
          state.settleOpen = false;
        }
      })
      .addCase(loadCreditDirectory.rejected, (state, action) => {
        if (action.payload?.code === 'FORBIDDEN' || action.payload?.status === 403) {
          state.status = 'denied';
        } else {
          state.status = 'failure';
        }
        state.statusHint = action.payload?.message ?? null;
      });
  },
});

export const {
  setCreditTab,
  setCreditQuery,
  setCreditSort,
  toggleOverdueOnly,
  setAgingFilter,
  openCreditDetail,
  closeCreditDetail,
  openSettleCredit,
  closeSettleCredit,
  markCreditSuccess,
  clearCreditStatus,
} = creditSlice.actions;

export const creditReducer = creditSlice.reducer;
