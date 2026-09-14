import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@/services/products';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/services/goodsReceipts';
import type { Supplier } from '@/services/suppliers';
import {
  emptyEntryDraft,
  emptyEntryLine,
  type CreateStatus,
  type EntryDraft,
  type EntryLine,
  type PageStatus,
} from '../PurchasesScreen.utils';
import { createPurchaseEntry, loadPurchaseDetail, loadPurchases } from './purchases.thunks';

export type PurchasesState = {
  status: PageStatus;
  statusHint: string | null;
  items: GoodsReceiptSummary[];
  query: string;
  selectedId: string | null;
  detail: GoodsReceiptDetail | null;
  detailStatus: PageStatus;
  suppliers: Supplier[];
  products: Product[];
  createOpen: boolean;
  createStatus: CreateStatus;
  createHint: string | null;
  draft: EntryDraft;
};

export const initialPurchasesState: PurchasesState = {
  status: 'idle',
  statusHint: null,
  items: [],
  query: '',
  selectedId: null,
  detail: null,
  detailStatus: null,
  suppliers: [],
  products: [],
  createOpen: false,
  createStatus: null,
  createHint: null,
  draft: emptyEntryDraft(),
};

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState: initialPurchasesState,
  reducers: {
    setPurchasesQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openPurchaseDetail(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
      state.detail = null;
      state.detailStatus = 'loading';
    },
    closePurchaseDetail(state) {
      state.selectedId = null;
      state.detail = null;
      state.detailStatus = null;
    },
    openCreatePurchase(state) {
      state.createOpen = true;
      state.createStatus = null;
      state.createHint = null;
      state.draft = emptyEntryDraft();
    },
    closeCreatePurchase(state) {
      state.createOpen = false;
      state.createStatus = null;
      state.createHint = null;
      state.draft = emptyEntryDraft();
    },
    setDraftSupplier(state, action: PayloadAction<string>) {
      state.draft.supplierId = action.payload;
      state.createHint = null;
      state.createStatus = null;
    },
    setDraftInvoiceNo(state, action: PayloadAction<string>) {
      state.draft.invoiceNo = action.payload;
      state.createHint = null;
      state.createStatus = null;
    },
    setDraftInvoiceDate(state, action: PayloadAction<string>) {
      state.draft.invoiceDate = action.payload;
      state.createHint = null;
      state.createStatus = null;
    },
    addDraftLine(state) {
      state.draft.lines.push(emptyEntryLine());
    },
    removeDraftLine(state, action: PayloadAction<string>) {
      if (state.draft.lines.length <= 1) {
        state.draft.lines = [emptyEntryLine()];
        return;
      }
      state.draft.lines = state.draft.lines.filter((line) => line.key !== action.payload);
    },
    patchDraftLine(
      state,
      action: PayloadAction<{ key: string; patch: Partial<Omit<EntryLine, 'key'>> }>,
    ) {
      const line = state.draft.lines.find((row) => row.key === action.payload.key);
      if (!line) return;
      Object.assign(line, action.payload.patch);
      state.createHint = null;
      state.createStatus = null;
    },
    setCreateValidation(state, action: PayloadAction<string>) {
      state.createStatus = 'validation';
      state.createHint = action.payload;
    },
    clearCreateHint(state) {
      state.createHint = null;
      if (state.createStatus === 'validation' || state.createStatus === 'success') {
        state.createStatus = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPurchases.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadPurchases.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.suppliers = action.payload.suppliers;
        state.products = action.payload.products;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
        state.statusHint = null;
      })
      .addCase(loadPurchases.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(loadPurchaseDetail.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(loadPurchaseDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
        state.detailStatus = null;
      })
      .addCase(loadPurchaseDetail.rejected, (state, action) => {
        state.detailStatus = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? state.statusHint;
      })
      .addCase(createPurchaseEntry.pending, (state) => {
        state.createStatus = 'saving';
        state.createHint = null;
      })
      .addCase(createPurchaseEntry.fulfilled, (state, action) => {
        state.createStatus = 'success';
        state.createHint = action.payload.message;
        state.createOpen = false;
        state.draft = emptyEntryDraft();
        const existing = state.items.findIndex((row) => row.id === action.payload.summary.id);
        if (existing >= 0) {
          state.items[existing] = action.payload.summary;
        } else {
          state.items = [action.payload.summary, ...state.items];
        }
        state.status = state.items.length === 0 ? 'empty' : null;
      })
      .addCase(createPurchaseEntry.rejected, (state, action) => {
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      });
  },
});

export const {
  setPurchasesQuery,
  openPurchaseDetail,
  closePurchaseDetail,
  openCreatePurchase,
  closeCreatePurchase,
  setDraftSupplier,
  setDraftInvoiceNo,
  setDraftInvoiceDate,
  addDraftLine,
  removeDraftLine,
  patchDraftLine,
  setCreateValidation,
  clearCreateHint,
} = purchasesSlice.actions;

export const purchasesReducer = purchasesSlice.reducer;
