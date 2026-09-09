import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SalesOrderRow } from '@/services/salesOrders';
import type { OrdersFilter } from '../OrdersScreen.utils';
import { loadOrders, shareOrderBill } from './orders.thunks';

export type OrdersStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'denied'
  | 'no_branch';

export type OrdersState = {
  status: OrdersStatus;
  statusHint: string | null;
  items: SalesOrderRow[];
  filter: OrdersFilter;
  query: string;
  selectedId: string | null;
  detailTab: 'details' | 'invoice';
  actionBusyId: string | null;
  actionHint: string | null;
};

export const initialOrdersState: OrdersState = {
  status: 'idle',
  statusHint: null,
  items: [],
  filter: 'all',
  query: '',
  selectedId: null,
  detailTab: 'details',
  actionBusyId: null,
  actionHint: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState: initialOrdersState,
  reducers: {
    setOrdersFilter(state, action: PayloadAction<OrdersFilter>) {
      state.filter = action.payload;
    },
    setOrdersQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openOrderDetail(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
      state.detailTab = 'details';
      state.actionHint = null;
    },
    closeOrderDetail(state) {
      state.selectedId = null;
      state.detailTab = 'details';
      state.actionHint = null;
    },
    setOrderDetailTab(state, action: PayloadAction<'details' | 'invoice'>) {
      state.detailTab = action.payload;
    },
    clearOrdersActionHint(state) {
      state.actionHint = null;
    },
    setOrdersActionHint(state, action: PayloadAction<string | null>) {
      state.actionHint = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.statusHint = null;
      })
      .addCase(loadOrders.rejected, (state, action) => {
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
      .addCase(shareOrderBill.pending, (state, action) => {
        state.actionBusyId = action.meta.arg;
        state.actionHint = null;
      })
      .addCase(shareOrderBill.fulfilled, (state, action) => {
        state.actionBusyId = null;
        state.actionHint = action.payload;
      })
      .addCase(shareOrderBill.rejected, (state, action) => {
        state.actionBusyId = null;
        state.actionHint = action.payload ?? null;
      });
  },
});

export const {
  setOrdersFilter,
  setOrdersQuery,
  openOrderDetail,
  closeOrderDetail,
  setOrderDetailTab,
  clearOrdersActionHint,
  setOrdersActionHint,
} = ordersSlice.actions;

export const ordersReducer = ordersSlice.reducer;
