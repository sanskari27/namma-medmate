import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SalesInvoice } from '@/services/salesInvoices';
import type {
  SalesReturn,
  SalesReturnRefundMode,
  SalesReturnSummary,
} from '@/services/salesReturns';
import type {
  CreateStatus,
  LineDraft,
  ReturnsFilter,
  ReturnsPageStatus,
} from '../ReturnsScreen.utils';
import {
  createReturn,
  findReturnBill,
  loadReturns,
  previewReturn,
} from './returns.thunks';

export type ReturnsState = {
  status: ReturnsPageStatus;
  statusHint: string | null;
  items: SalesReturnSummary[];
  filter: ReturnsFilter;
  query: string;
  selectedId: string | null;
  createOpen: boolean;
  createStatus: CreateStatus;
  createHint: string | null;
  billQuery: string;
  invoice: SalesInvoice | null;
  qtyByLine: LineDraft;
  reason: string;
  refundMode: SalesReturnRefundMode;
  preview: SalesReturn | null;
  completedInvoices: SalesInvoice[];
};

export const initialReturnsState: ReturnsState = {
  status: 'idle',
  statusHint: null,
  items: [],
  filter: 'all',
  query: '',
  selectedId: null,
  createOpen: false,
  createStatus: null,
  createHint: null,
  billQuery: '',
  invoice: null,
  qtyByLine: {},
  reason: '',
  refundMode: 'CASH',
  preview: null,
  completedInvoices: [],
};

const returnsSlice = createSlice({
  name: 'returns',
  initialState: initialReturnsState,
  reducers: {
    setReturnsFilter(state, action: PayloadAction<ReturnsFilter>) {
      state.filter = action.payload;
    },
    setReturnsQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openReturnDetail(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    closeReturnDetail(state) {
      state.selectedId = null;
    },
    openCreateReturn(state) {
      state.createOpen = true;
      state.createStatus = null;
      state.createHint = null;
      state.billQuery = '';
      state.invoice = null;
      state.qtyByLine = {};
      state.reason = '';
      state.refundMode = 'CASH';
      state.preview = null;
    },
    closeCreateReturn(state) {
      state.createOpen = false;
      state.createStatus = null;
      state.createHint = null;
      state.billQuery = '';
      state.invoice = null;
      state.qtyByLine = {};
      state.reason = '';
      state.refundMode = 'CASH';
      state.preview = null;
    },
    setBillQuery(state, action: PayloadAction<string>) {
      state.billQuery = action.payload;
    },
    clearFoundBill(state) {
      state.invoice = null;
      state.qtyByLine = {};
      state.preview = null;
      state.createStatus = null;
      state.createHint = null;
    },
    setReturnQty(state, action: PayloadAction<{ lineId: string; value: string }>) {
      state.qtyByLine[action.payload.lineId] = action.payload.value;
      state.preview = null;
    },
    setReturnReason(state, action: PayloadAction<string>) {
      state.reason = action.payload;
      state.preview = null;
    },
    setRefundMode(state, action: PayloadAction<SalesReturnRefundMode>) {
      state.refundMode = action.payload;
      state.preview = null;
    },
    clearCreateHint(state) {
      state.createHint = null;
      if (state.createStatus === 'success' || state.createStatus === 'validation') {
        state.createStatus = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadReturns.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadReturns.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.completedInvoices = action.payload.completedInvoices;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.statusHint = null;
      })
      .addCase(loadReturns.rejected, (state, action) => {
        const code = action.payload?.code;
        if (code === 'FORBIDDEN') {
          state.status = 'denied';
        } else if (code === 'NO_ACTIVE_BRANCH') {
          state.status = 'no_branch';
        } else {
          state.status = 'error';
        }
        state.statusHint = action.payload?.message ?? null;
        state.items = [];
      })
      .addCase(findReturnBill.pending, (state) => {
        state.createStatus = 'finding';
        state.createHint = null;
      })
      .addCase(findReturnBill.fulfilled, (state, action) => {
        state.invoice = action.payload;
        state.qtyByLine = {};
        state.preview = null;
        state.createStatus = null;
        state.createHint = null;
      })
      .addCase(findReturnBill.rejected, (state, action) => {
        state.invoice = null;
        state.preview = null;
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      })
      .addCase(previewReturn.pending, (state) => {
        state.createStatus = 'previewing';
        state.createHint = null;
      })
      .addCase(previewReturn.fulfilled, (state, action) => {
        state.preview = action.payload;
        state.createStatus = null;
        state.createHint = null;
      })
      .addCase(previewReturn.rejected, (state, action) => {
        state.preview = null;
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      })
      .addCase(createReturn.pending, (state) => {
        state.createStatus = 'recording';
        state.createHint = null;
      })
      .addCase(createReturn.fulfilled, (state, action) => {
        state.preview = action.payload.recorded;
        state.items = action.payload.items;
        state.completedInvoices = action.payload.completedInvoices;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.createStatus = 'success';
        state.createHint = null;
        state.invoice = null;
        state.qtyByLine = {};
        state.reason = '';
        state.billQuery = '';
      })
      .addCase(createReturn.rejected, (state, action) => {
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      });
  },
});

export const {
  setReturnsFilter,
  setReturnsQuery,
  openReturnDetail,
  closeReturnDetail,
  openCreateReturn,
  closeCreateReturn,
  setBillQuery,
  clearFoundBill,
  setReturnQty,
  setReturnReason,
  setRefundMode,
  clearCreateHint,
} = returnsSlice.actions;

export const returnsReducer = returnsSlice.reducer;
