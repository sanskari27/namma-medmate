import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CustomerCredit } from '@/services/credit';
import type {
  Customer,
  CustomerDirectoryItem,
  CustomerDirectoryPurchase,
} from '@/services/customers';
import { CUSTOMERS_CONTENT } from '../CustomersScreen.content';
import type {
  CustomersActionStatus,
  CustomersPageStatus,
  CustomersSort,
} from '../CustomersScreen.utils';
import { loadCustomerDetail, loadCustomers, saveCustomerProfile } from './customers.thunks';

export type CustomersState = {
  status: CustomersPageStatus;
  statusHint: string | null;
  actionStatus: CustomersActionStatus;
  items: CustomerDirectoryItem[];
  sort: CustomersSort;
  query: string;
  selectedKey: string | null;
  createOpen: boolean;
  settleOpen: boolean;
  editOpen: boolean;
  detailLoading: boolean;
  saveBusy: boolean;
  editHint: string | null;
  profile: Customer | null;
  credit: CustomerCredit | null;
  purchases: CustomerDirectoryPurchase[];
};

export const initialCustomersState: CustomersState = {
  status: 'idle',
  statusHint: null,
  actionStatus: null,
  items: [],
  sort: 'spenders',
  query: '',
  selectedKey: null,
  createOpen: false,
  settleOpen: false,
  editOpen: false,
  detailLoading: false,
  saveBusy: false,
  editHint: null,
  profile: null,
  credit: null,
  purchases: [],
};

const customersSlice = createSlice({
  name: 'customers',
  initialState: initialCustomersState,
  reducers: {
    setCustomersSort(state, action: PayloadAction<CustomersSort>) {
      state.sort = action.payload;
    },
    setCustomersQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openCustomerDetail(state, action: PayloadAction<string>) {
      state.selectedKey = action.payload;
      state.credit = null;
      state.purchases = [];
      state.profile = null;
      state.detailLoading = true;
      state.editOpen = false;
      state.editHint = null;
      state.actionStatus = null;
    },
    closeCustomerDetail(state) {
      state.selectedKey = null;
      state.credit = null;
      state.purchases = [];
      state.profile = null;
      state.detailLoading = false;
      state.settleOpen = false;
      state.editOpen = false;
      state.editHint = null;
      state.saveBusy = false;
    },
    openCreateCustomer(state) {
      state.createOpen = true;
      state.actionStatus = null;
    },
    closeCreateCustomer(state) {
      state.createOpen = false;
    },
    openSettleCredit(state) {
      state.settleOpen = true;
    },
    closeSettleCredit(state) {
      state.settleOpen = false;
    },
    openEditCustomer(state) {
      state.editOpen = true;
      state.editHint = null;
    },
    closeEditCustomer(state) {
      state.editOpen = false;
      state.editHint = null;
    },
    markCustomerAction(state, action: PayloadAction<CustomersActionStatus>) {
      state.actionStatus = action.payload;
    },
    clearCustomerAction(state) {
      state.actionStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = action.payload.length === 0 ? 'empty' : 'ready';
        state.statusHint = null;
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        if (action.payload?.code === 'FORBIDDEN') {
          state.status = 'denied';
        } else {
          state.status = 'error';
        }
        state.statusHint = action.payload?.message ?? null;
        state.items = [];
      })
      .addCase(loadCustomerDetail.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(loadCustomerDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.credit = action.payload.credit;
        state.purchases = action.payload.purchases;
        state.profile = action.payload.profile;
      })
      .addCase(loadCustomerDetail.rejected, (state) => {
        state.detailLoading = false;
        state.credit = null;
        state.purchases = [];
        state.profile = null;
        state.actionStatus = 'failure';
      })
      .addCase(saveCustomerProfile.pending, (state) => {
        state.saveBusy = true;
        state.editHint = null;
      })
      .addCase(saveCustomerProfile.fulfilled, (state, action) => {
        state.saveBusy = false;
        state.profile = action.payload.profile;
        state.items = action.payload.items;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.editOpen = false;
        state.editHint = null;
        state.actionStatus = 'success';
      })
      .addCase(saveCustomerProfile.rejected, (state, action) => {
        state.saveBusy = false;
        state.editHint = action.payload?.message ?? CUSTOMERS_CONTENT.status.failure;
        if (action.payload?.status === 'conflict') {
          state.actionStatus = 'conflict';
        } else if (action.payload?.status === 'validation') {
          state.actionStatus = 'validation';
        } else {
          state.actionStatus = 'failure';
        }
      });
  },
});

export const {
  setCustomersSort,
  setCustomersQuery,
  openCustomerDetail,
  closeCustomerDetail,
  openCreateCustomer,
  closeCreateCustomer,
  openSettleCredit,
  closeSettleCredit,
  openEditCustomer,
  closeEditCustomer,
  markCustomerAction,
  clearCustomerAction,
} = customersSlice.actions;

export const customersReducer = customersSlice.reducer;
