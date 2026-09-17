import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@/services/products';
import type { GoodsReceiptDetail, GoodsReceiptSummary } from '@/services/goodsReceipts';
import type { GoodsReceipts, PurchaseOrder } from '@/services/purchaseOrders';
import type { Supplier } from '@/services/suppliers';
import {
  emptyEntryDraft,
  emptyEntryLine,
  type CreateStatus,
  type EntryDraft,
  type EntryLine,
  type PageStatus,
} from '../PurchasesScreen.utils';
import {
  createIndent,
  createPurchaseEntry,
  draftFromReorder,
  issueIndent,
  loadDelivery,
  loadPurchaseDetail,
  loadPurchases,
  recordDelivery,
} from './purchases.thunks';

export type PurchasesDesk = 'bills' | 'indents';
export type CreateMode = 'bill' | 'indent';

export type DeliveryState = {
  open: boolean;
  poId: string | null;
  outstanding: GoodsReceipts | null;
  status: CreateStatus;
  hint: string | null;
  receiptReference: string;
  qtyByLineId: Record<string, string>;
};

export type PurchasesState = {
  status: PageStatus;
  statusHint: string | null;
  desk: PurchasesDesk;
  items: GoodsReceiptSummary[];
  orders: PurchaseOrder[];
  query: string;
  selectedId: string | null;
  detail: GoodsReceiptDetail | null;
  detailStatus: PageStatus;
  suppliers: Supplier[];
  products: Product[];
  createOpen: boolean;
  createMode: CreateMode;
  createStatus: CreateStatus;
  createHint: string | null;
  draft: EntryDraft;
  delivery: DeliveryState;
};

const emptyDelivery = (): DeliveryState => ({
  open: false,
  poId: null,
  outstanding: null,
  status: null,
  hint: null,
  receiptReference: '',
  qtyByLineId: {},
});

export const initialPurchasesState: PurchasesState = {
  status: 'idle',
  statusHint: null,
  desk: 'bills',
  items: [],
  orders: [],
  query: '',
  selectedId: null,
  detail: null,
  detailStatus: null,
  suppliers: [],
  products: [],
  createOpen: false,
  createMode: 'bill',
  createStatus: null,
  createHint: null,
  draft: emptyEntryDraft(),
  delivery: emptyDelivery(),
};

function upsertOrder(orders: PurchaseOrder[], next: PurchaseOrder): PurchaseOrder[] {
  const rest = orders.filter((row) => row.id !== next.id);
  return [next, ...rest];
}

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState: initialPurchasesState,
  reducers: {
    setPurchasesQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setPurchasesDesk(state, action: PayloadAction<PurchasesDesk>) {
      state.desk = action.payload;
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
    openCreatePurchase(state, action: PayloadAction<CreateMode | undefined>) {
      state.createOpen = true;
      state.createMode = action.payload ?? 'bill';
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
    closeDelivery(state) {
      state.delivery = emptyDelivery();
    },
    setDeliveryRef(state, action: PayloadAction<string>) {
      state.delivery.receiptReference = action.payload;
      state.delivery.hint = null;
      state.delivery.status = null;
    },
    setDeliveryQty(state, action: PayloadAction<{ lineId: string; qty: string }>) {
      state.delivery.qtyByLineId[action.payload.lineId] = action.payload.qty;
      state.delivery.hint = null;
      state.delivery.status = null;
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
        state.orders = action.payload.orders;
        state.suppliers = action.payload.suppliers;
        state.products = action.payload.products;
        state.status = action.payload.items.length === 0 && action.payload.orders.length === 0 ? 'empty' : null;
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
        state.desk = 'bills';
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
      })
      .addCase(createIndent.pending, (state) => {
        state.createStatus = 'saving';
        state.createHint = null;
      })
      .addCase(createIndent.fulfilled, (state, action) => {
        state.createStatus = 'success';
        state.createHint = action.payload.message;
        state.createOpen = false;
        state.draft = emptyEntryDraft();
        state.desk = 'indents';
        state.orders = upsertOrder(state.orders, action.payload.order);
        state.status = null;
      })
      .addCase(createIndent.rejected, (state, action) => {
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      })
      .addCase(issueIndent.fulfilled, (state, action) => {
        state.orders = upsertOrder(state.orders, action.payload);
        state.createHint = 'Indent issued. Record the delivery when goods arrive.';
        state.createStatus = 'success';
      })
      .addCase(issueIndent.rejected, (state, action) => {
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      })
      .addCase(loadDelivery.pending, (state, action) => {
        state.delivery = {
          ...emptyDelivery(),
          open: true,
          poId: action.meta.arg,
          status: 'saving',
        };
      })
      .addCase(loadDelivery.fulfilled, (state, action) => {
        const qtyByLineId: Record<string, string> = {};
        for (const line of action.payload.lines) {
          qtyByLineId[line.purchaseOrderLineId] = String(line.remainingQuantity);
        }
        state.delivery.outstanding = action.payload;
        state.delivery.qtyByLineId = qtyByLineId;
        state.delivery.status = null;
      })
      .addCase(loadDelivery.rejected, (state, action) => {
        state.delivery.status = action.payload?.status ?? 'failure';
        state.delivery.hint = action.payload?.message ?? null;
      })
      .addCase(recordDelivery.pending, (state) => {
        state.delivery.status = 'saving';
        state.delivery.hint = null;
      })
      .addCase(recordDelivery.fulfilled, (state, action) => {
        state.delivery = emptyDelivery();
        state.desk = 'bills';
        state.createHint = action.payload.message;
        state.createStatus = 'success';
        const existing = state.items.findIndex((row) => row.id === action.payload.summary.id);
        if (existing >= 0) {
          state.items[existing] = action.payload.summary;
        } else {
          state.items = [action.payload.summary, ...state.items];
        }
        state.orders = upsertOrder(state.orders, action.payload.order);
        state.status = null;
      })
      .addCase(recordDelivery.rejected, (state, action) => {
        state.delivery.status = action.payload?.status ?? 'failure';
        state.delivery.hint = action.payload?.message ?? null;
      })
      .addCase(draftFromReorder.pending, (state) => {
        state.createStatus = 'saving';
        state.createHint = null;
      })
      .addCase(draftFromReorder.fulfilled, (state, action) => {
        state.createStatus = 'success';
        state.createHint = action.payload.message;
        state.desk = 'indents';
        for (const order of action.payload.orders) {
          state.orders = upsertOrder(state.orders, order);
        }
        state.status = null;
      })
      .addCase(draftFromReorder.rejected, (state, action) => {
        state.createStatus = action.payload?.status ?? 'failure';
        state.createHint = action.payload?.message ?? null;
      });
  },
});

export const {
  setPurchasesQuery,
  setPurchasesDesk,
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
  closeDelivery,
  setDeliveryRef,
  setDeliveryQty,
} = purchasesSlice.actions;

export const purchasesReducer = purchasesSlice.reducer;
